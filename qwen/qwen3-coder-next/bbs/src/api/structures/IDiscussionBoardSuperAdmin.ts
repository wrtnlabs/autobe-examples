import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardSuperAdmin {
  /**
   * Refresh token issued during login that will be exchanged for new access and refresh tokens.
   */
  export type IRefresh = {};

  /**
   * Authentication response containing access and refresh tokens for super admin authentication sessions. This structure is automatically included in authentication responses for join, login, and refresh operations.
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
   * Request body for registering a new super administrator account. Contains authentication credentials and basic profile information needed to create a super admin account with the highest level of system access.
   */
  export type IJoin = {};

  /**
   * Login request body for super administrator authentication. Contains email address and password for credential validation. Also includes session context fields for authentication tracking and security auditing.
   */
  export type ILogin = {};
}
