import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardGuest {
  /**
   * Request body for refreshing a guest session to obtain new JWT access and refresh tokens. Guests submit their current refresh token to renew authentication before session expiration, maintaining continuous anonymous browsing access without re-registration. The token is validated against existing sessions and if active, new credentials are issued.
   */
  export type IRefresh = {
    /**
     * The guest's current refresh token used to validate and renew the session. This token identifies the anonymous browsing session and is checked for validity and expiration before issuing new credentials.
     *
     * @x-autobe-specification JWT refresh token string. Query discussion_board_guest_sessions to find session record matching this token. Verify expired_at has not passed. If valid, generate new access and refresh tokens, update session's expired_at, and return new credentials.
     */
    refresh_token: string;
  };

  /**
   * Authentication credentials and guest identification for anonymous browsing access. Returned when a guest successfully registers or refreshes their session. Contains the guest's unique identifier and JWT tokens granting temporary read-only access to sections, articles, and comments.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_guests.id. UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for guest registration using device fingerprint for anonymous browsing access to the discussion board platform.
   */
  export type IJoin = {
    /**
     * Unique device fingerprint identifier for guest tracking. Generated from browser/device characteristics to distinguish anonymous visitors without requiring authentication.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from discussion_board_guests.device_fingerprint. Unique constraint enforced at DB level. Generated from browser/device characteristics if not provided by client.
     */
    device_fingerprint: string;

    /**
     * Current page URL where the guest registration was initiated. Used for session tracking and traffic source analysis.
     *
     * @x-autobe-specification Session context field captured for initial guest session creation in discussion_board_guest_sessions. Not stored in discussion_board_guests table. Used for traffic source analysis and session tracking.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP referrer header indicating the previous page or traffic source. Used for analytics and session context.
     *
     * @x-autobe-specification Session context field captured for initial guest session creation in discussion_board_guest_sessions. Not stored in discussion_board_guests table. HTTP referrer header used for analytics.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address. Optional for server-side rendering (SSR) cases where IP may not be available.
     *
     * @x-autobe-specification Optional session context field captured for initial guest session creation in discussion_board_guest_sessions. Not stored in discussion_board_guests table. Optional for SSR cases where client cannot determine own IP; server captures as fallback.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
