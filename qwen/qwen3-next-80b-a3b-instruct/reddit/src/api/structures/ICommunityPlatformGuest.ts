import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformGuest {
  /**
   * Authentication response for guest users after successful registration or
   * token refresh.
   *
   * This schema represents the structured response for auth operations that
   * establish a guest session. It contains the guest identity and token
   * information necessary to maintain persistent anonymous browsing within
   * the platform.
   *
   * Unlike member authentication, this response does not include
   * user-specific permissions or profile data. It is designed for temporary,
   * stateless access where users can browse content without creating a full
   * account.
   *
   * This follows the platform's secure guest session pattern where all
   * authentication is token-based and does not require persistent user state
   * in the database.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the guest user
     *
     * Used to maintain session state and track guest activity. This value
     * will match the id in community_platform_guest table.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Expiration timestamp of the guest token
     *
     * The token will be rejected after this timestamp. Default expiration
     * is 4 hours after issuance.
     */
    expires_at: string & tags.Format<"date-time">;

    /**
     * JWT refresh token for guest session
     *
     * Used to obtain a new access token when the current one expires. This
     * prevents users from needing to re-register during extended browsing
     * sessions.
     */
    refresh_token: string;

    /**
     * Expiration timestamp of the guest refresh token
     *
     * The refresh token will be rejected after this timestamp. Default
     * expiration is 14 days after issuance.
     */
    refresh_expires_at: string & tags.Format<"date-time">;

    /**
     * The last known IP address of the guest
     *
     * Used for security and rate-limiting purposes. Matches the IP stored
     * in the guest's record in community_platform_guest table.
     */
    ip: string;

    /**
     * The user agent string from the browser request
     *
     * Used for device identification and compatibility analysis. Matches
     * the user agent stored in the guest's record in
     * community_platform_guest table.
     */
    user_agent: string;

    /**
     * Current state of the guest account
     *
     * Values: 'active', 'flagged', 'banned'. Indicates the account's
     * current access level based on behavior analysis.
     */
    status: string;
  };
}
