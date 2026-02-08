import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardGuest {
  /**
   * Request body schema for the guest join operation, allowing unauthenticated users to create a temporary guest account with necessary device and session identification information.
   */
  export type IJoin = {};

  /**
   * This schema represents the authorized guest user response including JWT access and refresh tokens, token expiration timestamps, and a guest session identifier. It enables stateless JWT authentication for temporary guest users in the discussion board system.
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
   * Summary information for a temporary guest user account, including device and session identifiers, IP and user agent for tracking, and lifecycle timestamps illustrating creation, update, and deletion status.
   */
  export type ISummary = {};

  /**
   * Request DTO for filtered and paginated search of temporary guest users in the discussion board system, with multiple optional filters and pagination parameters to control result views.
   */
  export type IRequest = {};

  /**
   * Request body to refresh JWT tokens for temporary guest sessions by submitting a valid refresh token string. Used for stateless authentication support for guest users who have only temporary sessions with no static accounts.
   */
  export type IRefresh = {};
}
