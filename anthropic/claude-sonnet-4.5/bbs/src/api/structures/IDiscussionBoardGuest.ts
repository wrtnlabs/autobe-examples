import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardGuest {
  /**
   * Guest session creation request for temporary browsing access.
   *
   * Guests can optionally provide email for newsletter signup. Session
   * metadata is typically captured server-side from request headers.
   */
  export type ICreate = {
    /**
     * Optional email address for newsletter signup.
     *
     * Used for conversion tracking and marketing outreach. Not required for
     * guest browsing.
     */
    email?: (string & tags.Format<"email">) | null | undefined;

    /**
     * Optional session tracking metadata.
     *
     * Captures IP address and user agent for analytics. Typically populated
     * automatically by backend from request context.
     */
    session_metadata?: IDiscussionBoardGuest.ISessionMetadata | undefined;
  };

  /**
   * Authorization response for guest session with JWT tokens.
   *
   * Returned after successful guest registration, enabling tracked browsing
   * sessions.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the guest session.
     *
     * Generated upon guest account creation.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Refresh token request for renewing guest access tokens.
   *
   * Contains the refresh token to be validated and exchanged for a new access
   * token.
   */
  export type IRefresh = {
    /**
     * Current valid refresh token for obtaining new access token.
     *
     * Must be a non-expired, non-revoked refresh token from a previous
     * guest session.
     */
    refresh_token: string;
  };

  /**
   * Session metadata for guest tracking and analytics.
   *
   * Captures technical information about the guest's browsing session
   * including IP address and user agent. Used for conversion funnel analysis
   * and user experience optimization.
   */
  export type ISessionMetadata = {
    /**
     * IP address of the guest for analytics and security.
     *
     * IPv4 or IPv6 format. Used for geographic tracking and abuse
     * prevention.
     *
     * Typically captured automatically by backend from request headers.
     */
    ip_address?: string | null | undefined;

    /**
     * Browser user agent string for device identification.
     *
     * Used for compatibility analysis and device type classification.
     * Captured from HTTP headers.
     *
     * Enables understanding guest device usage patterns.
     */
    user_agent?: string | null | undefined;
  };
}
