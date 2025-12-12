import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

export interface Attempt {
  _id?: string;
  userId: string;
  quizId: string;
  quizTitle: string;
  score: number;
  totalPoints: number;
  percentage: number;
  timeTaken?: number;
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttemptsService {
  private apiUrl = 'http://localhost:5001/api/attempts';
  private attempts = new BehaviorSubject<Attempt[]>([]);
  attempts$ = this.attempts.asObservable();

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }

  async loadAttempts(userId: string): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<Attempt[]>(`${this.apiUrl}?userId=${userId}`)
      );
      this.attempts.next(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err) {
      console.error('Failed to load attempts:', err);
      this.attempts.next([]);
    }
  }

  async saveAttempt(attempt: Omit<Attempt, '_id' | 'date'>): Promise<Attempt> {
    const tempId = 'temp-' + Date.now();
    const optimistic: Attempt = { ...attempt, _id: tempId, date: new Date().toISOString() };
    this.attempts.next([...this.attempts.value, optimistic]);

    try {
      const saved = await firstValueFrom(this.http.post<Attempt>(this.apiUrl, attempt));
      this.attempts.next(this.attempts.value.map(a => a._id === tempId ? saved : a));
      return saved;
    } catch (err) {
      console.error('Save failed:', err);
      this.attempts.next(this.attempts.value.filter(a => a._id !== tempId));
      throw err;
    }
  }

  async deleteAttempt(attemptId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.apiUrl}/${attemptId}`, { headers: this.getAuthHeaders() })
    );
    this.attempts.next(this.attempts.value.filter(a => a._id !== attemptId));
  }
}