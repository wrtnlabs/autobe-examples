import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconomicBoardSuperAdministrator {
  /**
   * Request body for registering a new superAdministrator account. Provides the fundamental identity information required to create a superAdministrator profile with authentication credentials. Includes email for login, password for authentication, display name for public presentation, and optional bio for personal context.
   */
  export type IJoin = {};

  /**
   * Authentication response containing access and refresh tokens for authenticated superAdministrator sessions. The access token is a short-lived JWT used for API authentication, while the refresh token is a long-lived token stored securely in an HTTP-only cookie for token renewal.
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
   * Request body for the refresh token operation. Used to regenerate a new access token using a valid refresh token stored in an HttpOnly, Secure cookie. This request has no body parameters because the refresh token is transmitted via a secure cookie, not in the request body. Includes no fields to prevent exposure of sensitive session identifiers in request payloads, following security best practices.
   */
  export type IRefresh = {};

  /**
   * Request body for authenticating a superAdministrator using their email address and password. The system validates the email against existing superAdministrator accounts and checks the password against the stored bcrypt hash.
   */
  export type ILogin = {};
}
