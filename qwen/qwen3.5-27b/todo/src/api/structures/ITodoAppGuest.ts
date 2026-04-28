import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppGuest {
  /**
   * Authorization response for guest users containing identity and authentication tokens.
   *
   * This response is returned after successful guest registration or token refresh. It provides the guest's unique identifier and the access/refresh tokens needed for authenticated API calls.
   *
   * The access token is used for authenticating subsequent requests, while the refresh token allows obtaining new access tokens without re-authentication. Both tokens have expiration times that must be respected by the client.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account.
     *
     * This UUID identifies the guest across sessions and is used to associate the guest with their todos and other data. The same id is returned in all authorization responses for this guest, providing a consistent identity reference.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from todo_app_guests.id. This
         *   is the unique identifier for the guest account, used to reference
         *   the guest in subsequent authenticated requests.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
         * @x-autobe-specification Authorization token comes from the session
         *   table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for refreshing guest authentication tokens.
   *
   * Contains the refresh token obtained from a previous guest authentication session. This token is validated against the todo_app_guest_sessions table to generate new access and refresh token pairs, extending the guest's session without requiring re-registration.
   *
   * The refresh token must be a valid JWT token from a previous /todoApp/auth/guest/join or /todoApp/auth/guest/refresh response. No authentication is required for this endpoint since the refresh token itself serves as proof of prior authentication.
   */
  export type IRefresh = {
    /**
     * Refresh token obtained from a previous guest authentication.
     *
     * This long-lived JWT token allows obtaining new access tokens without re-authentication. Must be a valid token from a previous /todoApp/auth/guest/join or /todoApp/auth/guest/refresh response. The token is validated against the todo_app_guest_sessions table to verify it hasn't expired or been revoked.
     *
         * @x-autobe-specification JWT refresh token obtained from previous
         *   guest authentication (ITodoAppGuest.IAuthorized response). Token is
         *   validated against todo_app_guest_sessions table to verify session
         *   validity, expiration, and revocation status. Upon validation, new
         *   access and refresh token pair is generated and session record is
         *   updated.
     */
    refreshToken: string;
  };

  /**
   * Request body for guest registration or session activation using device fingerprint.
   *
   * This type represents the data required to create a new guest account or activate an existing guest session in the todo application. Guests are unauthenticated users who access the system without email/password credentials, identified uniquely by their device fingerprint.
   *
   * The device fingerprint is extracted from the client's browser and device characteristics, providing persistent anonymous identity across sessions. Session context fields (href, referrer, ip) are captured for security auditing, session management, and tracking the origin of authentication attempts.
   */
  export type IJoin = {
    /**
     * Unique device identifier for guest authentication.
     *
     * This fingerprint is generated from browser and device characteristics and serves as the guest's persistent identity across sessions. It enables anonymous access without requiring email or password credentials. The fingerprint must be unique to prevent guest identity collisions and is used to determine whether to create a new guest or reactivate an existing one.
     *
         * @x-autobe-database-schema-property device_fingerprint
         * @x-autobe-specification Direct mapping from device_fingerprint column
         *   in todo_app_guests table. This is the unique identifier for guest
         *   accounts. Used to check if guest already exists (reactivate
         *   session) or create new guest record.
     */
    deviceFingerprint: string;

    /**
     * Current page URL where the guest authentication occurred.
     *
     * This field captures the origin URL for session tracking and security auditing purposes. It helps identify which page or feature the user was accessing when they initiated the guest authentication flow.
     *
         * @x-autobe-specification Session context field captured from request.
         *   Stored in todo_app_guest_sessions.href column when creating the
         *   guest's authentication session. Represents the current page URL
         *   where the guest join occurred.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referring URL that led to the current page.
     *
     * This field captures the navigation source for session tracking and analytics. It helps understand user journey patterns and where guests are coming from when they first access the application.
     *
         * @x-autobe-specification Session context field captured from request.
         *   Stored in todo_app_guest_sessions.referrer column when creating the
         *   guest's authentication session. Represents the referring URL that
         *   led to the current page.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for session tracking and security.
     *
     * This field is optional because in server-side rendering (SSR) scenarios, the client may not know its own IP address. When provided, it helps with security auditing, rate limiting, and detecting suspicious authentication patterns. If not provided, the server captures the IP as a fallback.
     *
         * @x-autobe-specification Optional session context field captured from
         *   request body. If not provided by client (e.g., in SSR scenarios
         *   where client cannot know its own IP), server captures it as
         *   fallback. Stored in todo_app_guest_sessions.ip column when creating
         *   the guest's authentication session.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
