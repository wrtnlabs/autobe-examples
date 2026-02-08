import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformGuest {
  /**
   * Request body for guest registration using a unique device fingerprint to enable unauthenticated guest access with limited permissions and session management.
   */
  export type IJoin = {};

  /**
   * Authorization response data for a guest user, including their unique identifier and JWT authorization token used for authenticated requests in the system.
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
   * Request DTO for guests to submit a refresh token string to renew their JWT authorization tokens and maintain session continuity without requiring re-authentication.
   */
  export type IRefresh = {};

  /**
   * Summary of guest user account in the system. Includes the unique ID, device fingerprint used for identification, creation and update timestamps, and optional soft deletion timestamp.
   */
  export type ISummary = {};

  /**
   * Request parameters for retrieving a filtered and paginated list of guest accounts, including device fingerprint filter, creation date range, pagination cursor, and limit for page size.
   */
  export type IRequest = {};
}
