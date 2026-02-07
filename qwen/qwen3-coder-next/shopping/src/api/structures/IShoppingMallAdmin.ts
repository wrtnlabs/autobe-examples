import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallAdmin {
  /**
   * Admin authentication response containing JWT access and refresh tokens along with admin profile information for secure session management.
   */
  export type IAuthorized = {
    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Admin login request payload containing email and password credentials for administrator authentication.
   */
  export type ILogin = {};

  /**
   * Request body for admin self-registration. Provides email, password, and display name for creating a new administrator account.
   */
  export type IJoin = {};

  /**
   * Request payload for admin authentication token refresh operation. Contains the refresh token that was issued during login and is used to obtain new access and refresh tokens.
   */
  export type IRefresh = {};
}
