import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditPlatformGuest {
  /**
   * Request body for guest registration endpoint that creates or retrieves a temporary guest account using device fingerprint as the unique identifier. Includes session context information for tracking and analytics purposes.
   */
  export type IJoin = {
    /**
     * Unique device fingerprint hash for identifying returning guests
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from guests.device_fingerprint. Unique constraint. Required field.
     */
    device_fingerprint: string;
  };

  /**
   * Request body for guest session refresh containing the refresh token.
   */
  export type IRefresh = {
    /**
     * The refresh token used to authenticate the guest session refresh request. This is a JWT token that proves the guest's previous authentication.
     *
     * @x-autobe-specification JWT refresh token string for guest session authentication. Used to obtain new access and refresh tokens in the guest session refresh flow.
     */
    refreshToken: string;
  };

  /**
   * Guest session authorization response containing JWT tokens for maintaining authenticated session state.
   */
  export type IAuthorized = {
    /**
     * Guest unique identifier
     *
     * @x-autobe-specification Direct mapping from guests.id when available. UUID primary key for guest account identification. For guest sessions that don't have a corresponding database record, this may be a session-generated identifier.
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
