import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardGuest {
  /**
   * Authorization response for guest authentication containing the authenticated guest's unique identifier and JWT token pair for API access. This is returned by both join and refresh operations to establish or renew guest sessions.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the authenticated guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_guests.id. UUID format unique identifier for the authenticated guest account.
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
   * Guest registration request for creating a new anonymous visitor identity. Captures the device fingerprint for unique identification and session metadata (current page URL, referrer, optional IP) for security tracking. Unlike member registration, guests are identified solely by device fingerprint without email or password credentials.
   */
  export type IJoin = {
    /**
     * Unique device fingerprint for identifying anonymous visitors. Provides persistent identification without requiring authentication credentials like email or password.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping to discussion_board_guests.device_fingerprint column. Must be unique - validation performed before guest creation. Used to identify returning anonymous visitors across sessions without requiring authentication credentials.
     */
    device_fingerprint: string;

    /**
     * Current page URL for navigation context and session tracking. Used for analytics and security auditing purposes.
     *
     * @x-autobe-specification Session context field stored in discussion_board_guest_sessions.href column. Captures the current page URL for navigation context and session tracking. Used for analytics and security auditing. Required field for session creation during join operation.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referring page URL for traffic source analysis. Null if the visitor arrived directly or the referrer is not available.
     *
     * @x-autobe-specification Session context field stored in discussion_board_guest_sessions.referrer column. Optional field for traffic source analysis. Null if no referrer available. Captured during session creation in join operation for understanding user navigation paths.
     */
    referrer?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Client IP address for security tracking. Optional - if not provided, the server will extract it from the incoming request.
     *
     * @x-autobe-specification Session context field stored in discussion_board_guest_sessions.ip column. Optional - in SSR (Server Side Rendering) environments, the client cannot determine its own IP, so server extracts it from the request as fallback. Used for security tracking and fraud prevention. Nullable in request body.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Request body for refreshing guest authentication tokens. Contains the refresh token from a previous join or refresh operation, along with optional connection metadata for session tracking.
   */
  export type IRefresh = {
    /**
     * JWT refresh token for obtaining new access tokens.
     *
     * @x-autobe-specification JWT refresh token from previous join or refresh operation. Validated by: (1) verifying cryptographic signature, (2) extracting guest.id and session.id claims, (3) querying discussion_board_guest_sessions to verify session is active, (4) checking expired_at > current timestamp, (5) verifying guest account deleted_at is null. Single-use token invalidated after successful refresh.
     */
    refresh: string;
  };
}
