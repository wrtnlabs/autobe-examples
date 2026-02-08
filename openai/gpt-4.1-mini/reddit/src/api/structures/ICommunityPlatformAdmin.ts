import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformAdmin {
  /**
   * Request payload for system administrator to refresh JWT authentication tokens using a refresh token. Contains only the refresh token string required for validation and renewal.
   */
  export type IRefresh = {};

  /**
   * Request body schema for administrator login containing the email address and plaintext password for authentication.
   */
  export type ILogin = {};

  /**
   * Request body schema for registering a new system administrator account. Includes required login credentials and optional profile fields.
   */
  export type IJoin = {};

  /**
   * Authorized administrator account including public profile information and JWT authorization tokens. Used post authentication steps such as registration, login, or token refresh to provide secured API access.
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
   * Request DTO to filter and paginate community platform administrator accounts based on optional email, displayName, creation date range, and soft deletion status.
   */
  export type IRequest = {};

  /**
   * Summary view of an administrator account including unique identifier, email, display name, optional biography, avatar URL, and timestamps for creation, update, and soft deletion. Excludes sensitive password hashes. Intended for admin list and summary display in the community platform.
   */
  export type ISummary = {};

  /**
   * Detailed administrator profile entity providing all public information except the password hash, used for secure administrative account management within the community platform.
   */
  export type IEntity = {};
}
