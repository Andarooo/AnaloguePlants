import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { NgbAccordionModule} from '@ng-bootstrap/ng-bootstrap';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgbAccordionModule,RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'AnaloguePlants';
  
  constructor(private readonly httpClient: HttpClient) { }
  plantList : any[] = [];
  biocacheURL = 'https://biocache.ala.org.au/ws/occurrences/facets';
  traitURL = 'https://bie.ala.org.au/externalSite/ausTraitsSummary';
  speciesURL = 'https://api.ala.org.au/species/species/lookup/bulk';
  geocodeURL = 'https://maps.googleapis.com/maps/api/geocode/json';
  apiKey = '';

  getPlantsForLocation()
  {
    var location : string = (<HTMLInputElement>document.getElementById('location'))?.value;
    var radius : number = (<HTMLInputElement>document.getElementById('radius'))?.valueAsNumber;

    interface geocodeResponse{
      results : {geometry: {location: {lat:number,lng:number}}}[]
    }

    this.httpClient.get<geocodeResponse>(`${this.geocodeURL}`,{params:{key:this.apiKey,address:location}}).subscribe(locRes => {
      var options = {params:
        {
          q:"kingdom:Plantae",
          lat:locRes.results[0].geometry.location.lat,
          lon:locRes.results[0].geometry.location.lng,
          radius:radius,
          facets: "scientificName",
          flimit: 10
        }
      }
      debugger;
      interface trait{
        unit:string,
        min: number,
        max: number,
        mean: number,
        taxon_name: string,
        definition: string,
        trait_name: string
      };
      interface TraitsResponse{
        numeric_traits: trait[]
      };
      interface BiocacheResponseItem {
        fieldName:string,
        fieldResult: [{
          label:string,
          i18nCode: string,
          count: number,
          fq: string
        }],
        count:number
      }

      interface SpeciesResponse
      {
        guid:string,
        name: string
      }
        interface PlantRecord
        {
            scientificName:string,
            traits: trait[]
        };

      this.httpClient.get<BiocacheResponseItem[]>(`${this.biocacheURL}`,options).subscribe(bcr => {
        this.httpClient.post<SpeciesResponse[]>(this.speciesURL,{vernacular:false,names:bcr[0].fieldResult.map(r => r.label)}).subscribe(speciesList => { 
          var list : PlantRecord[] = []
          for(let record of bcr[0].fieldResult){
            var plantRecord : PlantRecord = {scientificName : record.label,traits:[]};
            list.push(plantRecord);
            var searchGuid : string = speciesList.find(sr => sr.name === record.label)?.name ?? "";
            this.httpClient.get<TraitsResponse>(`${this.traitURL}`,{params:{s:record.label, guid: searchGuid}}).subscribe(tr => {
              plantRecord.traits = tr.numeric_traits;
              
              debugger;
            });
          }
          this.plantList = list
        });
      });
    });
  }
}
