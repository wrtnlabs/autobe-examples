import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCommunityGuest {
  /**
   * Request payload for refreshing a guest authentication session. Submit a valid refresh token to obtain new access and refresh tokens without re-registering as a guest. Include session context information (source page) for audit purposes.
   */
  export type IRefresh = {
    /**
     * Valid refresh token string from the guest's current session.
     *
     * @x-autobe-specification Client-provided refresh token string. Must match a valid session in reddit_community_guest_sessions table. System validates this token before issuing new access/refresh tokens.
     */
    refresh_token: string;
  };

  /**
   * Guest authentication response containing user identity and session credentials returned after successful guest registration or token refresh.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated guest account.
     *
     * @x-autobe-specification Guest account unique identifier extracted from JWT token 'sub' claim. Computed from JWT payload during authentication. Source: JWT token subject claim containing guest account ID from session validation.
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
   * Request body for registering a new guest account using device fingerprint identification. Guests are unauthenticated visitors identified by their device rather than email/password. The device fingerprint ensures each visitor has a unique persistent identity across browsing sessions while maintaining privacy.
   *
   * Upon registration, a new guest account is created and immediately authenticated with access and refresh tokens. The guest account is linked to the device fingerprint and can access public content like the popular feed and community pages.
   */
  export type IJoin = {
    /**
     * @x-autobe-database-schema-property device_id
     */
    device_id: string & tags.Format<"uuid">;

    /**
     * Browser and device user agent string.
     *
     * @x-autobe-database-schema-property user_agent
     * @x-autobe-specification Optional: browser/device user agent string from client. Nullable: may be empty or not provided.
     */
    user_agent?: string | null | undefined;
    href: string & tags.Format<"uri">;
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for session tracking.
     *
     * @x-autobe-database-schema-property ip_address
     * @x-autobe-specification Optional client IP address in IPv4 format. When not provided by client (SSR case), backend may populate from server IP.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };
}
