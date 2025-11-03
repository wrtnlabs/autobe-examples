import { tags } from "typia";

export namespace ICommunityPlatformUserLoginAttempt {
  /**
   * Request body for searching/paginating user login attempts
   * (community_platform_user_login_attempts). Provides search and filter
   * parameters for retrieving login attempts belonging to a specified user.
   * Used for audit, security, and troubleshooting. Contains parameters for
   * pagination, filtering by result and IP, and time window filter.
   *
   * Note: This type is used for search requests on PATCH
   * /communityPlatform/user/users/{userId}/loginAttempts and associated admin
   * endpoints. Limit has DB and business upper-bound (see system config for
   * max).
   */
  export type IRequest = {
    /** Page number for paginated results (starts at 1). */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Maximum number of results per page (upper-bound: 100 for security;
     * lower-bound: 1).
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /**
     * Filter for login attempts after or on this timestamp (ISO8601); null
     * means no lower bound.
     */
    from?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Filter for login attempts before or on this timestamp (ISO8601); null
     * means no upper bound.
     */
    to?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional filter for IP address substring (partial match). Null means
     * match all IPs.
     */
    ip?: string | null | undefined;

    /**
     * Optional: filter for login attempt result only for success/failure;
     * null means match all results.
     */
    success?: boolean | null | undefined;
  };

  /**
   * Summary type for a user login attempt. Encapsulates essential information
   * about a specific login action for logging, auditing, and displaying
   * authentication history in user/admin dashboards. Based on the
   * `community_platform_user_login_attempts` Prisma table. Does not expose
   * raw credentials for security.
   *
   * Used for tracking and displaying high-level login attempts without
   * revealing sensitive authentication details.
   */
  export type ISummary = {
    /**
     * Unique identifier for the login attempt. Matches the primary key of
     * `community_platform_user_login_attempts.id`.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp of when this login attempt occurred. Useful for UI login
     * history and security tracking.
     */
    attempted_at: string & tags.Format<"date-time">;

    /**
     * IP address from which the login attempt was initiated. Used in risk
     * assessment and audit logs.
     */
    ip: string;

    /**
     * Indicates if the login attempt was successful (true) or a failure
     * (false). Security/audit use only.
     */
    success: boolean;
  };
}
