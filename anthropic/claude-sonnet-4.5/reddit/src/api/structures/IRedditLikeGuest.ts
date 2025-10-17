import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditLikeGuest {
  /**
   * Guest registration request body.
   *
   * Contains optional analytics tracking information for guest session
   * initialization. Guest registration does not require credentials like
   * email or password, enabling anonymous platform browsing.
   */
  export type ICreate = {
    /**
     * IP address of the guest for analytics tracking.
     *
     * Optional field capturing the guest's IP address for analytics
     * purposes, session tracking, and abuse prevention. This information
     * helps the platform understand guest behavior patterns and detect
     * potential abuse.
     */
    ip_address?: string | undefined;

    /**
     * Browser user agent string for device analytics.
     *
     * Optional field containing the browser's user agent string, enabling
     * device and browser type tracking for analytics and user experience
     * optimization.
     */
    user_agent?: string | undefined;
  };

  /**
   * Guest authorization response with session details and JWT tokens.
   *
   * Returned after successful guest registration, providing the guest account
   * information and authentication tokens required for making authenticated
   * API requests within guest permission scope.
   */
  export type IAuthorized = {
    /** Unique identifier for the guest user account. */
    id: string & tags.Format<"uuid">;

    /**
     * Unique session identifier for tracking guest activity.
     *
     * Generated during guest registration for analytics and anonymous user
     * behavior tracking across visits.
     */
    session_identifier: string;

    /**
     * User role designation.
     *
     * Always 'guest' for guest accounts, indicating limited permissions for
     * browsing without full participation rights.
     */
    role: "guest";

    /** Timestamp of the guest's first platform visit. */
    first_visit_at: string & tags.Format<"date-time">;

    /** Timestamp of the guest's most recent platform visit. */
    last_visit_at: string & tags.Format<"date-time">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Refresh token request for guest sessions.
   *
   * Contains the refresh token needed to obtain a new access token when the
   * current access token expires.
   */
  export type IRefresh = {
    /**
     * Valid refresh token from previous authentication.
     *
     * The refresh token issued during guest registration, used to obtain a
     * new access token without re-registration.
     */
    refresh_token: string;
  };
}
