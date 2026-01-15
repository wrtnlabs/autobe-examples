import { tags } from "typia";

import { IRedditPlatformAuthToken } from "./IRedditPlatformAuthToken";

export namespace IRedditPlatformSiteAdmin {
  /**
   * Request DTO for site administrator logout operation. Contains the refresh
   * token required to gracefully terminate an active session with immediate
   * token revocation for enhanced security.
   *
   * The system validates the refresh token against stored authentication
   * tokens before revoking, ensuring only legitimate sessions are terminated.
   * This validation confirms the token's association with the current session
   * and prevents unauthorized logout attempts.
   *
   * This minimal request structure adheres to security best practices by
   * exposing only the necessary data (the token itself) without any user
   * identity or session details, as they're already established through the
   * authenticated session.
   */
  export type ILogout = {
    /**
     * Client-provided refresh token to be revoked for session termination.
     * This token must match the active authentication token in the system
     * to validate the logout request before revocation.
     *
     * Tokens are generated per session and securely stored by the client
     * (e.g., in secure HTTP-only cookies or local storage) for session
     * management. The system validates the token against the
     * reddit_platform_auth_tokens table before processing the revocation.
     */
    refreshToken: string & tags.Format<"uuid">;
  };

  /**
   * Authorization payload containing session tokens for site administrators,
   * used after successful registration, login, or token refresh.
   *
   * This schema represents the main response body after all site
   * administrator authentication operations. It contains the unique
   * identifier linking to the site admin record and the token structure
   * required for subsequent API requests. The response maintains full
   * security compliance by not including any sensitive or password-related
   * fields.
   *
   * The token property points to a separate IAuthorizationToken schema which
   * defines the actual access token, refresh token, and their expiration
   * times. This separation ensures token management and security protocols
   * are well-defined and consistent across all authorization flows.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the site administrator. This is the primary key
     * from the reddit_platform_siteadmins table, used to establish the user
     * identity for all subsequent requests. The ID follows standard UUID
     * format for consistent identification across all systems. Unlike
     * password fields, this field is required in all authorization
     * responses as it's used to track and manage user sessions.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IRedditPlatformAuthToken;
  };

  /**
   * Summary representation of a site administrator, providing essential
   * information for display in administrative contexts without exposing
   * sensitive account details. This DTO is optimized for performance in
   * listings, references, and contextual displays where full administrator
   * details are unnecessary but identifier and name information are
   * critical.
   *
   * The site administrator summary includes the unique identifier and display
   * name, which are sufficient for session context, auditing, and user
   * interface rendering. By excluding sensitive fields such as email,
   * password, and authentication tokens, this schema ensures security
   * compliance while maintaining the necessary data for administrative user
   * interfaces.
   *
   * This summary type is used specifically in session records
   * (IRedditPlatformSiteAdminSession) to reference the associated site
   * administrator without requiring additional API calls for context. It's
   * designed as a lightweight variant to minimize payload size in responses
   * while providing all necessary information for typical administrative
   * interactions.
   */
  export type ISummary = {
    /**
     * Unique identifier for the site administrator.
     *
     * This is a globally unique identifier used as the primary key for
     * referencing site administrators across all system endpoints. The UUID
     * format ensures uniqueness and is required for proper authentication
     * and session management.
     *
     * The ID is essential for maintaining referential integrity between
     * sessions and site administrators, allowing the system to efficiently
     * link session data to the correct administrator account.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Public display name of the site administrator.
     *
     * This is the user-friendly name shown in administrative interfaces for
     * identifying administrators. It should be a non-sensitive, easily
     * recognizable name that aligns with the platform's user display
     * conventions.
     *
     * The name represents a user-visible field without security
     * implications, making it safe to expose in summary views while
     * maintaining user anonymity where necessary.
     */
    name: string;
  };
}
