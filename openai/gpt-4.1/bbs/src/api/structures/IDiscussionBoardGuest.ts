import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardGuest {
  /**
   * Authorization schema for a registered guest entity in the discussion
   * board system.
   *
   * This schema represents the authorization/session token issuance for a
   * guest session as backed by the discussion_board_guests table in the
   * database. It contains only non-personal, anonymous session tracking data,
   * with no credential or identity information. The anonymous_token field
   * enables session continuity, while the id field acts as a unique
   * identifier. This type is meant to be used as the response structure for
   * guest session creation and refresh endpoints, facilitating device or
   * browser-level personalization without requiring login or exposing any
   * sensitive or credentialed data.
   *
   * There is no correspondence to a JWT or membership level with this
   * authorization type; it is always limited to basic analytics and tracking
   * use only.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest record in the discussion_board_guests
     * table.
     *
     * Maps directly to `id` in the database, which is the primary key
     * (UUID). Serves as the permanent record for device/session tracking
     * until soft deletion (deleted_at) occurs.
     *
     * This value is required and should be stored for the duration of a
     * guest session.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Random anonymous token issued to the guest for persistent
     * session/device tracking.
     *
     * This value corresponds to the unique constraint on anonymous_token in
     * the discussion_board_guests table, facilitating deduplication and
     * enabling the resumption of sessions if the same browser/device
     * presents this token in the future. This is NOT PII and is generated
     * to provide minimal session continuity without user authentication.
     */
    anonymous_token: string;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Session refresh request schema for guest sessions in the discussion board
   * system.
   *
   * This schema defines the requirements for a guest session refresh request,
   * as implemented by the /auth/guest/refresh endpoint. The only required
   * field is anonymous_token, which is the same unique string issued at
   * session creation. The operation uses this value to locate the active
   * guest in the discussion_board_guests table and refresh session validity.
   * No personal or additional credential data are required or accepted in
   * this schema; there is no password, email, or identity information.
   *
   * If a session is not found or is soft-deleted, the refresh operation fails
   * and returns a business error indicating the session is invalid or
   * expired.
   */
  export type IRefresh = {
    /**
     * The anonymous token previously issued to the guest session to be
     * refreshed.
     *
     * This value must match the anonymous_token column in the
     * discussion_board_guests database table. It serves as the only method
     * of identifying the session in question and must adhere to the unique
     * token format expected at creation. Required for any session refresh,
     * and must be kept secure by the client to avoid orphaned or expired
     * sessions.
     */
    anonymous_token: string;
  };
}
