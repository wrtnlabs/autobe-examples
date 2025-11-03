import { tags } from "typia";

export namespace ICommunityPlatformAdminLoginAttempt {
  /**
   * Request parameters for paginated, filterable admin login attempt search,
   * referencing the community_platform_admin_login_attempts table for audit,
   * compliance, and security review.
   */
  export type IRequest = {
    /**
     * Page number for paginated admin login attempt search results (minimum
     * 1).
     */
    page: number & tags.Type<"int32">;

    /**
     * Maximum number of login attempts to include per page (default 20,
     * platform max enforced).
     */
    limit: number & tags.Type<"int32">;

    /**
     * Unique identifier (UUID) of the target admin; filters attempts for
     * this admin only.
     */
    admin_id: string & tags.Format<"uuid">;

    /**
     * Start date-time for filtering login attempts (inclusive). ISO 8601
     * format. Optional.
     */
    from_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date-time for filtering login attempts (inclusive). ISO 8601
     * format. Optional.
     */
    to_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Flag to filter login attempts by success (true) or failure (false).
     * Optional.
     */
    success?: boolean | undefined;

    /**
     * IP address filter; returns only login attempts originating from the
     * provided IP address. Optional.
     */
    ip?: string | undefined;
  };

  /**
   * Summary DTO for logging and auditing administrator login attempts in the
   * community platform. Used in security dashboards, compliance reporting,
   * and investigation of administrator authentication events. Each field is
   * mapped to a column of the 'community_platform_admin_login_attempts'
   * Prisma schema for precise auditability. This summary provides a minimal
   * yet complete view for admin login history listing with explicit
   * traceability for each property. All fields are sourced directly from
   * their corresponding schema columns and support audit and forensic
   * workflows.
   */
  export type ISummary = {
    /**
     * Unique identifier of this login attempt record. Sourced from
     * 'community_platform_admin_login_attempts.id' UUID column in the
     * Prisma schema. Required for traceability and forensic audit trails.
     */
    id: string & tags.Format<"uuid">;

    /**
     * UUID of the admin account associated with this login attempt.
     * References
     * 'community_platform_admin_login_attempts.community_platform_admin_id'
     * in the schema. Used for linking login events to specific
     * administrators in audit and investigation contexts.
     */
    community_platform_admin_id: string & tags.Format<"uuid">;

    /**
     * ISO 8601 UTC timestamp recording the date and time when this login
     * attempt was made. Mapped from
     * 'community_platform_admin_login_attempts.attempted_at'. Essential for
     * security timeline analysis and compliance reviews.
     */
    attempted_at: string & tags.Format<"date-time">;

    /**
     * IP address from which this login attempt originated, as logged in
     * 'community_platform_admin_login_attempts.ip'. Used for fraud
     * detection, risk management, and source validation.
     */
    ip: string;

    /**
     * Boolean flag indicating whether the authentication attempt was
     * successful (true) or failed (false), per
     * 'community_platform_admin_login_attempts.success'. Used in
     * monitoring, lockout, and compliance flows.
     */
    success: boolean;
  };
}
