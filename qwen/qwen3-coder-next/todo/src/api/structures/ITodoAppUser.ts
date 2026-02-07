import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppUser {
  /**
   * User registration request body containing email for login, plain-text password (securely hashed), and display name for application identification.
   */
  export type IJoin = {};

  /**
   * Request body for user login operation containing email and password credentials for authentication.
   */
  export type ILogin = {};

  /**
   * Request body for refreshing authentication tokens. Contains the refresh token that will be validated and used to issue new access (and optionally refresh) tokens.
   */
  export type IRefresh = {};

  /**
   * Authorization token information containing access and refresh tokens for authenticated sessions. This response structure is returned after successful user authentication (login, registration, or token refresh) and provides the client with tokens needed for subsequent authenticated API requests.
   */
  export type IAuthorized = {
    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };
}
