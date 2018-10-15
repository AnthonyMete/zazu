import { HttpClient } from '@angular/common/http';
import {
  Injectable
} from '@angular/core';
import * as UserViewModel from '../view-models/user.viewmodel';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private http: HttpClient) {}
  VIEWACCESS = 'VIEWACCESS';
  ADMIN = 'ADMIN';
  URL = '../../../assets/example-data/';

  /**
   *  Method for getting all users for all organizations
   */
  public async getAllUsers(): Promise<UserViewModel.SimpleUserView[]> {
    console.log('getting all users');
    return await ((this.http.get<UserViewModel.SimpleUserView[]>( URL + 'user-list.mockdata.json')).toPromise());
  }

  /**
   * Getting specific user using user ID
   * @param id - id of the user you want to get information
   */
  public async getUser(id): Promise<UserViewModel.User> {
    return await ((this.http.get<UserViewModel.User>( URL +  'single-user.mockdata.json')).toPromise());
  }

  /**
   * Getting all user for specific organization
   * @param orgId -  ID of the organization you want to get all users
   */
  public async getUsersByOrganization(orgId): Promise<UserViewModel.SimpleUserView[]> {
    return await ((this.http.get<UserViewModel.SimpleUserView[]>(URL + 'user-list.mockdata.json')).toPromise());
  }

  /**
   * Create new user
   * @param user - user object for creating new user
   */
  public async createNewUser(user: UserViewModel.CreateNewUser) {
    return await null;
  }

  /**
   * Edit user
   * @param user - user object for editing user
   */
  public async editUser(user: UserViewModel.EditUser) {
    return await null;
  }

  /**
   * Delete user
   * @param userID - ID of the user you want to delete
   */
  public async deleteUser(userID: string) {
    return await null;
  }
}
