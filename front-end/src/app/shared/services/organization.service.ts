import { AuthService } from './../../auth/auth.service';
import { OrganizationDetails } from './../view-models/organization.viewmodel';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as OrganizationViewModel from '../view-models/organization.viewmodel';

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {

  constructor(private http: HttpClient, private authService: AuthService) {}

  organizations = [];

  URL = '../../../assets/example-data/';

  /**
   *  Method for getting all organizations with just name and ID
   *  Primarily used in filters and breadcrumbs
   */
  public async getAllOrganizationsWithNoDetails(): Promise<OrganizationViewModel.SimpleOrganization[]> {
    return await ((this.http.get<OrganizationViewModel.OrganizationDetails[]>( '/api' + '/getAllOrganizationsWithNoDetails')).toPromise());
    // return await ((this.http.get<OrganizationViewModel.OrganizationDetails[]>( this.URL + 'organizations.mockdata.json')).toPromise());
  }


  /**
   * Method for getting all of the organizations with all the details
   */
  public async getAllOrganizations(): Promise<OrganizationViewModel.OrganizationDetails[]> {
    return await ((this.http.get<OrganizationViewModel.OrganizationDetails[]>( '/api' + '/getAllOrganizations')).toPromise());
    // return await ((this.http.get<OrganizationViewModel.OrganizationDetails[]>( this.URL + 'organizations.mockdata.json')).toPromise());
  }

 /**
  * Method for getting details of a specific organization
  * @param id - ID of the organization
  */
  public async getOrganizationById(id): Promise<OrganizationViewModel.OrganizationDetails> {
    return await  await ((this.http.get<OrganizationViewModel.OrganizationDetails>( '/api' + '/getOrganizationById/' + id)).toPromise());
    // return await ((this.http.get<OrganizationViewModel.OrganizationDetails>( this.URL + 'single-organization.mockup.json')).toPromise());
  }

  /**
   * Method for getting all current directory
   */
  public async getAllCategories(): Promise<string[]> {
    const categories = [];
    const orgs = await this.getAllOrganizations();
    orgs.forEach(org => {
      org.categories.forEach(category => {
        if (!categories.includes(category)) {
          categories.push(category);
        }
      });
    });
    return categories;
  }

  /**
   * Method for creating new orgnization
   * @param organization - organization object
   */
  public async createNewOrganization(organization: OrganizationViewModel.CreateNewOrganization) {
    if (await this.authService.canSend()) {
      return await ((this.http.post<OrganizationViewModel.CreateOrganizationReturn>('/api/' + 'createOrganization', organization)).toPromise());
    } else {
      return await {status: '403', message: 'You do not have permission to perform this action' };
    }
  }

  /**
   * Method for editing organization
   * @param organization - organiztion object
   */
  public async editOrganization(organization: OrganizationViewModel.EditOrganization) {
    if (await this.authService.canSend()) {
      return await ((this.http.post('/api' + '/editOrganization/', organization)).toPromise());
    } else {
      return await {status: '403', message: 'You do not have permission to perform this action'};
    }
  }

  /**
   * Method for deleting organization
   * @param organizationID - ID of the organization you want to delete
   */
  public async deleteOrganization(organization) {
    if (await this.authService.canSend()) {
    return await ((this.http.post('/api/' + 'deleteOrganization', organization)).toPromise());
    } else {
      return await {status: '403', message: 'You do not have permission to perform this action'};
    }
  }

  /********** LOCAL ORGANIZATION METHODS FOR OPTIMIZATION AND LESS API CALLS  **********/

  /**
   * Gets the organization based on local variable.
   * This is created for breadcrumbs mostly
   * @param id organization ID
   */
  public async getLocalOrganization(id) {
    console.log('local org called');
    if (this.organizations.length === 0) {

      try {
        this.organizations = await this.getAllOrganizations();
        const orga = await this.organizations.find(org => {
          return org._id === id;
        });
        console.log(this.organizations);
        console.log(orga);
        return orga;
      } catch (error) {
        console.log(error);
      }
    }
    const organization = await this.organizations.find(org => {
      return org._id === id;
    });
    console.log(this.organizations);
    console.log(organization);
    return organization;
  }

  /**
   * Set Local Org
   */
  public setLocalOrg(org) {
    this.organizations = org;
  }
}
