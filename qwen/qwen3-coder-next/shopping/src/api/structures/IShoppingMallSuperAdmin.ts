import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallSuperAdmin {
  /**
   * Request body for super admin authentication login containing email address and password credentials.
   */
  export type ILogin = {};

  /**
   * Request payload for refreshing authentication tokens for a super admin session. Contains the refresh token and optional security metadata for session validation.
   */
  export type IRefresh = {};

  /**
   * Complete authentication response for super admin users containing JWT tokens and identity information for session management. This DTO is returned after successful authentication operations (join, login, refresh) and includes access and refresh tokens that enable stateless session management. The access token provides short-term API access while the refresh token enables token renewal without re-authentication.
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
   * Request body for registering a new super admin account on the e-commerce shopping mall platform. Contains authentication credentials and optional session context for security auditing.
   */
  export type IJoin = {};
}
