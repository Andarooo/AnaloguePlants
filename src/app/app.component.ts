import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';
import { environment } from './../environments/environment';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgbAccordionModule, RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'AnaloguePlants';

  constructor(private readonly httpClient: HttpClient) { }
  plantList: any[] = [];


  getPlantsForLocation() {
    var location: string = (<HTMLInputElement>document.getElementById('location'))?.value;
    var radius: number = (<HTMLInputElement>document.getElementById('radius'))?.valueAsNumber;

    interface geocodeResponse {
      results: { geometry: { location: { lat: number, lng: number } } }[]
    }

    this.httpClient.get<geocodeResponse>(`${environment.geocodeURL}`, { params: { key: environment.GoogleAPIKey, address: location } }).subscribe(locRes => {
      var options = {
        params:
        {
          q: "kingdom:Plantae",
          lat: locRes.results[0].geometry.location.lat,
          lon: locRes.results[0].geometry.location.lng,
          radius: radius,
          facets: "scientificName",
          flimit: 2
        }
      }
      interface numericTrait {
        unit: string,
        min: number,
        max: number,
        mean: number,
        taxon_name: string,
        definition: string,
        trait_name: string
      };

      interface categoricalTrait {
        trait_values: string,
        taxon_name: string,
        definition: string,
        trait_name: string
      };

      interface TraitsResponse {
        numeric_traits: numericTrait[]
        categorical_traits: categoricalTrait[]
      };

      interface BiocacheResponseItem {
        fieldName: string,
        fieldResult: [{
          label: string,
          i18nCode: string,
          count: number,
          fq: string
        }],
        count: number
      };

      interface SpeciesResponse {
        guid: string,
        name: string
      };

      interface PlantRecord {
        scientificName: string,
        numericTraits: numericTrait[],
        categoricalTraits: categoricalTrait[]
      };

      this.httpClient.get<BiocacheResponseItem[]>(`${environment.biocacheURL}`, options).subscribe(bcr => {
        this.httpClient.post<SpeciesResponse[]>(environment.speciesURL, { vernacular: false, names: bcr[0].fieldResult.map(r => r.label) }).subscribe(speciesList => {
          let list: PlantRecord[] = []
          for (let record of bcr[0].fieldResult) {
            let plantRecord: PlantRecord = { scientificName: record.label, numericTraits: [], categoricalTraits: [] };
            list.push(plantRecord);
            let searchGuid: string = speciesList.find(sr => sr.name === record.label)?.name ?? "";
            this.httpClient.get<TraitsResponse>(`${environment.traitURL}`, { params: { s: record.label, guid: searchGuid } }).subscribe(tr => {
              plantRecord.numericTraits = tr.numeric_traits;
              plantRecord.categoricalTraits = tr.categorical_traits;
            });
          }
          this.plantList = list
        });
      });
    });
  }
}
