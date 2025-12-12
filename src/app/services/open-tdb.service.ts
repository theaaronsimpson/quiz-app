import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface OpenTdbQuestion {
  category: string;
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

export interface OpenTdbResponse {
  response_code: number;
  results: OpenTdbQuestion[];
}

@Injectable({
  providedIn: 'root'
})
export class OpenTdbService {
  private apiUrl = 'https://opentdb.com/api.php';

  constructor(private http: HttpClient) {}

  getQuestions(params: {
    amount?: number;
    category?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    type?: 'multiple' | 'boolean';
  } = {}): Observable<OpenTdbQuestion[]> {
    let httpParams = new HttpParams();

    if (params.amount) httpParams = httpParams.set('amount', params.amount.toString());
    if (params.category) httpParams = httpParams.set('category', params.category.toString());
    if (params.difficulty) httpParams = httpParams.set('difficulty', params.difficulty);
    if (params.type) httpParams = httpParams.set('type', params.type);

    return this.http.get<OpenTdbResponse>(this.apiUrl, { params: httpParams }).pipe(
      map(response => {
        if (response.response_code !== 0) {
          throw new Error('Failed to fetch questions from OpenTDB');
        }
        return response.results;
      }),
      map(results => results.map(q => ({
        ...q,
        question: this.decodeHtml(q.question),
        correct_answer: this.decodeHtml(q.correct_answer),
        incorrect_answers: q.incorrect_answers.map(ans => this.decodeHtml(ans))
      })))
    );
  }

  getCategories(): Observable<{ id: number; name: string }[]> {
    return this.http.get<{ trivia_categories: { id: number; name: string }[] }>(
      'https://opentdb.com/api_category.php'
    ).pipe(
      map(res => res.trivia_categories)
    );
  }

  private decodeHtml(html: string): string {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  }
}