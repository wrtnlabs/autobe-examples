import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardGuest {
  /**
   * Request body for renewing guest authentication session. Contains the refresh token that was previously issued during guest join or previous refresh operation. This token is validated against the session table to verify the guest's authentication state and extend their browsing session without requiring re-authentication.
   */
  export type IRefresh = {
    /**
     * JWT refresh token for session renewal. This token was issued during guest join or previous refresh operation and is used to obtain new access tokens without re-authentication.
     *
     * @x-autobe-specification JWT refresh token string. Implementation: Validate against discussion_board_guest_sessions.refresh_token column where expired_at > current time. Must match an existing valid session. This token is not stored in discussion_board_guests table but in the session table.
     */
    refresh_token: string;
  };

  /**
   * Request body for guest registration. Guests are identified by device fingerprint (browser characteristics) and do not require email or password. Includes session context (current URL, referrer, IP) for security auditing and traffic source tracking.
   */
  export type IJoin = {
    /**
     * Unique device identifier (browser fingerprint) that identifies this guest across requests. Derived from browser characteristics like user-agent, screen resolution, and installed fonts.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from discussion_board_guests.device_fingerprint column. Unique constraint ensures same device gets same guest identity across sessions. Used to identify guests without email/password.
     */
    device_fingerprint: string;

    /**
     * Current URL where the guest is accessing the platform. Used as the entry point for session tracking and traffic source analysis.
     *
     * @x-autobe-specification Session context field stored in discussion_board_guest_sessions.href column, not in guests table. Captures the current URL as the entry point for the guest session. Required for traffic source tracking.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating where the guest came from before accessing the platform. Used for traffic source tracking and analytics.
     *
     * @x-autobe-specification Session context field stored in discussion_board_guest_sessions.referrer column, not in guests table. Captures the referrer URL to track where the guest came from (search engine, social media, direct link, etc.). Required for traffic source tracking.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for security auditing and rate limiting. Optional because in server-side rendering, the client cannot know its own IP address - the server will capture it as fallback.
     *
     * @x-autobe-specification Session context field stored in discussion_board_guest_sessions.ip column, not in guests table. Client IP address for security auditing and rate limiting. Optional in IJoin because in SSR (Server Side Rendering) the client cannot know its own IP - the server captures it as fallback (body.ip ?? serverIp).
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Authorization response for guest authentication containing the guest identity and JWT tokens for session access. The access token is short-lived (typically 15 minutes) for secure API access, while the refresh token is longer-lived (typically 30 minutes) to allow token renewal without re-authentication. Guests use these tokens to browse sections and view public articles during their session.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the guest account. This UUID is used to identify the guest across their browsing session and is derived from the discussion_board_guests table.
     *
     * @x-autobe-specification Guest identity UUID from discussion_board_guests.id. This is the primary key of the guest record created or retrieved during authentication. Used to identify the guest across their browsing session.
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
   * Lightweight summary of a guest user for list displays and session references. Guests are anonymous users identified by device fingerprint rather than email authentication. This summary includes essential identification information for displaying guest sessions in administrative views and audit logs.
   */
  export type ISummary = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_guests.id. Primary key UUID identifying the guest account.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Device fingerprint that uniquely identifies this guest across sessions.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from discussion_board_guests.device_fingerprint. Unique browser/device identifier used to recognize the same guest across requests. Has unique constraint in database.
     */
    device_fingerprint: string;

    /**
     * Timestamp when the guest account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_guests.created_at. Timestamp when the guest identity was first created. Format: ISO 8601 date-time.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
