import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCloneGuestSession {
  /**
   * Authorization response containing guest session identity and JWT tokens for API access.
   *
   * This type is returned after successful guest join or token refresh operations. The accessToken is used in Authorization headers for authenticated API calls, while the refreshToken allows renewal of expired sessions without re-authentication. Guest tokens have shorter expiration times than member tokens reflecting the temporary nature of guest access.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest session account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_clone_guests.id. UUID primary key.
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
   * Request body for refreshing an expired or expiring guest session token. Contains the current refreshToken that was previously issued during guest session creation. The server validates this token and issues new access/refresh token pair to extend the guest session.
   */
  export type IRefresh = {
    /**
     * The current refresh token issued during guest session creation. Used to validate the session and generate new access/refresh tokens.
     *
     * @x-autobe-specification The refreshToken field is extracted from the request body and validated against the refresh_token column in reddit_clone_guest_sessions table. Server verifies: (1) Token signature is valid, (2) Token not expired (expires_refresh_at > now()), (3) Token belongs to a guest session. This is a validation operation, not direct column mapping.
     */
    refreshToken: string & tags.Format<"password">;
  };

  /**
   * Request body for guest join operation containing device fingerprint and session context for establishing a guest session on the Reddit-like platform.
   */
  export type IJoin = {
    /**
     * Unique device fingerprint string used to identify and track the guest user's device across sessions.
     *
     * @x-autobe-database-schema-property fingerprint
     * @x-autobe-specification Direct mapping from reddit_clone_guests.fingerprint. Unique constraint on this column ensures one guest record per device fingerprint.
     */
    fingerprint: string;

    /**
     * The URL of the page the guest was on when initiating the session join request.
     *
     * @x-autobe-specification User-provided HTTP Referer header value. Stored in session context for analytics and security tracking. Reflects the page URL from which the guest initiated authentication.
     */
    href: string & tags.Format<"uri">;

    /**
     * IPv4 address of the client device connecting to the API.
     *
     * @x-autobe-specification Optional in IJoin because in SSR (Server Side Rendering) the client cannot know its own IP address. Server captures the actual client IP as fallback (body.ip ?? serverIp). Stored in reddit_clone_guest_sessions.ip for audit and security purposes.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * The URL of the page the guest was referred from, indicating the prior location that directed traffic to this endpoint.
     *
     * @x-autobe-specification User-provided HTTP Referer header value. Stored in session context for analytics and tracking user navigation patterns. May be empty string if no referrer.
     */
    referrer: string & tags.Format<"uri">;
  };
}
