import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';

export interface User {
  id: string;
  username: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private apiUrl = 'http://localhost:5001/api/users';
  private currentUser = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUser.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromToken();
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }

  private loadUserFromToken() {
    const token = localStorage.getItem('token');
    if (token) {
      this.http.get<User>(`${this.apiUrl}/me`, { headers: this.getAuthHeaders() }).subscribe({
        next: (user) => this.currentUser.next(user),
        error: () => {
          localStorage.removeItem('token');
          this.currentUser.next(null);
        }
      });
    }
  }

  register(data: { username: string; email: string; password: string }) {
    return this.http.post<{ user: User; token: string }>(`${this.apiUrl}/register`, data).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        this.currentUser.next(res.user);
      })
    );
  }

  login(email: string, password: string) {
    return this.http.post<{ user: User; token: string }>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        this.currentUser.next(res.user);
      })
    );
  }

update(updates: Partial<User>) {
  return this.http.put<User>(`${this.apiUrl}/profile`, updates, { 
    headers: this.getAuthHeaders() 
  }).pipe(
    tap(user => this.currentUser.next(user))
  );
}

delete(userId: string) {
  return this.http.delete(`${this.apiUrl}/profile`, {
    headers: this.getAuthHeaders()
  }).pipe(
    tap(() => {
      localStorage.removeItem('token');
      this.currentUser.next(null);
    })
  );
}

  logout() {
    localStorage.removeItem('token');
    this.currentUser.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUser.value;
  }
}