import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconPoliticalDiscussionSystemAdministrator {
  /**
   * System administrator authentication response with user profile only
   * (tokens handled via HTTP headers).
   *
   * Contains the authenticated administrator's profile information for
   * accessing system administration functions. This response provides
   * immediate access to user management, content moderation, system
   * configuration, and platform oversight capabilities.
   *
   * The authentication response includes the administrator's unique
   * identifier, display name for system identification, email address for
   * account management, and account status verification. Optional profile
   * fields include biography and avatar URL for enhanced community presence.
   * Authentication tokens are transmitted via secure HTTP headers
   * (Authorization: Bearer) rather than included in the response body for
   * enhanced security.
   *
   * System administrators authenticated through this endpoint gain
   * comprehensive platform privileges including:
   *
   * - Full user management and account administration capabilities
   * - System configuration and platform settings management
   * - Content moderation and discussion oversight functions
   * - Platform analytics, reporting, and audit trail access
   * - Discussion category and platform policy management
   *
   * This response enables immediate access to all administrative API
   * endpoints and dashboard functions following successful authentication.
   * Token security is enhanced by transmitting authentication tokens via HTTP
   * headers rather than response bodies, preventing potential XSS attacks and
   * token leakage.
   *
   * Security measures ensure that administrator accounts maintain appropriate
   * access levels while protecting sensitive system information and providing
   * comprehensive oversight of the economic and political discussion
   * platform.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated system administrator. */
    id: string & tags.Format<"uuid">;

    /**
     * Administrator's display name for identification and community
     * presence.
     */
    display_name: string;

    /**
     * Administrator's email address for account and communication
     * management.
     */
    email: string & tags.Format<"email">;

    /**
     * Optional administrator biography describing expertise or background
     * in economics/politics. Provides context for community interaction and
     * establishes credibility for administrative decisions.
     */
    bio?: string | undefined;

    /**
     * Optional profile picture URL for administrator identification in
     * discussions and administrative interfaces. If not provided, a default
     * avatar will be used for system administration activities.
     */
    avatar_url?: string | undefined;

    /**
     * Administrator account status, always 'active' for authenticated
     * users.
     */
    status: "active";

    /**
     * Timestamp when the administrator account was initially created in the
     * system. Automatically set by the database and represents the exact
     * moment of administrative account setup.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the administrator account information was last
     * modified. Automatically updated by the database trigger to reflect
     * any profile changes or account updates.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft delete timestamp for deactivated administrator accounts. Null
     * for active administrators. Used for audit trails and potential
     * account restoration while preserving historical administrative
     * actions.
     */
    deleted_at?: (string & tags.Format<"date-time">) | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}
