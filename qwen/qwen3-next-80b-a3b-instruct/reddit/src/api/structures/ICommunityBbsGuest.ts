import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityBbsGuest {
  /**
   * Request payload for creating a temporary guest identity. No parameters
   * are required since the client is not authenticated and the system
   * generates a unique guest identifier automatically.
   */
  export type IJoin = {};

  /**
   * Request DTO for refreshing a temporary guest session. Contains only the
   * refresh token needed to extend the guest's access token without requiring
   * authentication credentials.
   */
  export type IRefresh = {
    /**
     * Refresh token used to extend the temporary guest session. Must be a
     * valid UUID-formatted JWT token.
     *
     * @x-autobe-specification Direct mapping from Authorization header or request body refresh token field. This is the JWT refresh token that needs validation for signature and expiration.
     */
    refresh_token: string & tags.Format<"uuid">;
  };

  /**
   * Authentication response for temporary guest users. Contains the guest's
   * unique identifier and JWT access token for session management during
   * anonymous browsing sessions.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the temporary guest identity, generated as a
     * UUID when the guest joins the system.
     *
     * @x-autobe-specification Direct mapping from community_bbs_guest.id field (UUID) created during guest join.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };
}
