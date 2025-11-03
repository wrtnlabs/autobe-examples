import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IPoliticsBbsVisitorUser {
  /**
   * Request body for visitor account registration on the politicsBbs
   * discussion board. Creates temporary guest accounts that provide session
   * management for unauthenticated users, enabling tracking of visitor
   * activity and basic personalization features. Visitor accounts receive
   * limited JWT tokens for session continuity while maintaining appropriate
   * security for guest users.
   *
   * This registration DTO supports the politicsBBS platform's visitor system
   * for temporary access to political and economic discussions. The visitor
   * accounts provide basic session management capabilities while maintaining
   * anonymity and limited privileges appropriate for guest users.
   *
   * The authentication model supports different user types through a
   * polymorphic ownership pattern where visitors, members, and moderators
   * have distinct access levels and capabilities. Visitor accounts are
   * designed for temporary browsing of economic policy discussions and
   * political analysis content.
   *
   * The session tracking fields (ip, href, referrer) enable comprehensive
   * audit trails and analytics for visitor behavior analysis while
   * maintaining appropriate privacy boundaries for guest users who browse
   * political discourse content.
   *
   * Username validation ensures consistent display across article access and
   * comment viewing activity while preventing impersonation or confusion with
   * authenticated member accounts in the discussion forum interface.
   */
  export type IJoin = {
    /**
     * Connection URL (current page URL) - MANDATORY. Provides session
     * context for tracking visitor entry points and navigation patterns.
     * Must be a valid URI format reflecting the actual page from which
     * registration is initiated.
     */
    href: string & tags.Format<"uri">;

    /**
     * Client IP address for session tracking and audit purposes. Optional
     * field that may be provided by the client for SSR scenarios or when
     * server cannot reliably extract IP from request headers while
     * maintaining privacy boundaries for visitor accounts.
     */
    ip?: string | undefined;

    /**
     * Password for the visitor account. Must meet complexity requirements:
     * minimum 8 characters including at least one uppercase letter, one
     * lowercase letter, and one number. Used for authentication and session
     * management with visitor-level security constraints reflecting
     * temporary account nature.
     */
    password: string &
      tags.MinLength<8> &
      tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$">;

    /**
     * Referrer URL (previous page URL) - MANDATORY. Tracks how visitors
     * arrive at the site for analytics and session attribution. Must be a
     * valid URI format representing the page that led to registration, can
     * be empty string for direct access.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Unique username for the visitor account. Must be 3-20 characters
     * using only letters, numbers, and hyphens. Used for display purposes
     * and session identification in visitor contexts while excluding
     * personal identifiers appropriate for guest accounts.
     */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9-]+$">;
  };

  /**
   * Response body for visitor authorization on the politicsBBS discussion
   * board. Provides comprehensive visitor account details with JWT
   * authentication tokens for session management across the political and
   * economic discourse platform.
   *
   * This authorization response contains the complete visitor account profile
   * following successful authentication, supporting the polymorphic ownership
   * pattern where visitors receive limited session capabilities appropriate
   * for temporary guest users engaging with policy discussions and economic
   * analysis content.
   *
   * The response structure enables visitor session management through JWT
   * tokens while maintaining appropriate security boundaries for
   * unauthenticated users browsing political discourse and economic policy
   * debates. Visitor accounts support read-only access to approved articles,
   * comments, and community discussions.
   *
   * Account details include unique visitor identification with timestamps for
   * activity tracking and session management across the discussion platform.
   * The JWT tokens provide secure authentication for subsequent API
   * interactions while reflecting the temporary nature of guest user access
   * to political and economic content.
   *
   * The visitor system enables basic platform functionality including article
   * browsing, comment viewing, and search operations while maintaining
   * appropriate security constraints for guest users who engage with
   * political discourse and economic policy analysis through the politics
   * discussion board interface.
   */
  export type IAuthorized = {
    /**
     * Unique visitor identifier from politics_bbs_visitors.id field. This
     * UUID serves as the primary key for visitor session management and
     * security auditing across the discussion platform.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Visitor's username from politics_bbs_visitors.username field used for
     * display and session identification in visitor contexts with URL-safe
     * formatting constraints.
     */
    username: string;

    /**
     * Secure password hash from politics_bbs_visitors.password_hash field
     * used for authentication verification using bcrypt or similar secure
     * hashing algorithms.
     */
    password_hash: string &
      tags.JsonSchemaPlugin<{
        "x-autobe-prisma-field": "password_hash";
      }>;

    /**
     * Visitor account creation timestamp from
     * politics_bbs_visitors.created_at field tracking when the temporary
     * guest account was established on the platform.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last visitor activity timestamp from
     * politics_bbs_visitors.last_seen_at field for session timeout and
     * activity analytics in visitor contexts.
     */
    last_seen_at: string & tags.Format<"date-time">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}
