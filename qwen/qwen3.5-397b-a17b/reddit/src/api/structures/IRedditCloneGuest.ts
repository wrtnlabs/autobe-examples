import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCloneGuest {
  /**
   * Request body for refreshing an expired guest session. Contains the refresh token that was issued during the initial guest join operation or previous refresh.
   */
  export type IRefresh = {
    /**
     * Refresh token for session renewal, originally issued during guest join or previous refresh operation.
     *
     * @x-autobe-specification Refresh token string validated against reddit_clone_guest_sessions. Server decodes JWT to extract guest_id and session_id for session lookup and expiration check. Not a direct column mapping - token is computed/validated by authentication service.
     */
    refresh_token: string;
  };

  /**
   * Request body for creating a guest account for anonymous platform access. Contains the device fingerprint for unique guest identification and session context metadata (current page URL, referrer URL, and IP address) for analytics and security tracking.
   */
  export type IJoin = {
    /**
     * Unique device fingerprint identifier for anonymous guest identification. Serves as the primary identifier for guest accounts - submitting the same fingerprint again reuses the existing guest account rather than creating a duplicate.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from reddit_clone_guests.device_fingerprint. Unique constraint enforced at database level. Used to identify returning guests - if fingerprint exists, existing account is reused.
     */
    device_fingerprint: string;

    /**
     * Current page URL where the guest joined from. Used for analytics and security tracking of the guest session.
     *
     * @x-autobe-specification Session context field stored in reddit_clone_guest_sessions.href column. Captures the current page URL where the guest joined from for analytics and security tracking. Not stored in the guest account table itself.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that directed the guest to this page. Used for analytics and understanding traffic sources.
     *
     * @x-autobe-specification Session context field stored in reddit_clone_guest_sessions.referrer column. Captures the referrer URL that directed the guest to the join page for analytics and traffic source tracking. Not stored in the guest account table itself.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Guest's IP address. Optional for server-side rendering cases where the server captures the IP as fallback. Used for security tracking and analytics.
     *
     * @x-autobe-specification Session context field stored in reddit_clone_guest_sessions.ip column. Captures the guest's IP address for security and analytics. Optional (nullable) to support server-side rendering scenarios where the client cannot know its own IP - the server captures it as fallback. Format: IPv4 address.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Guest account authorization response containing credentials for anonymous platform access. Returned when a guest account is created or refreshed. Includes the guest account identifier and a token object with access token, refresh token, and expiration timestamps for authenticating subsequent API requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_clone_guests.id. UUID generated on guest account creation.
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
