import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private route: Router) {}

  async canActivate() {
    if ( await this.authService.isAuthenticated()) {
      console.log('You are authenticated, go through!');
      return true;
    } else {
      console.log('Not an Authenticated! Begoneeeee');
      this.route.navigate(['unauthorized']);
      return false;
    }
  }
}
