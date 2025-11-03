import { tags } from "typia";

export namespace IShoppingAdminSession {
  /**
   * Request DTO for filtering, searching, and paginating administrator
   * session records from shopping_admin_sessions. Allows querying by session
   * status, IP, login/expiration times, and result ordering. Used for
   * administrative session audits and compliance review. Pagination is
   * mandatory; page and limit must always be set. Additional criteria help
   * restrict/sort session records as needed for operational or security
   * investigation.
   */
  export type IRequest = {
    /**
     * Optional filter for session status. Use 'active' to search currently
     * open (non-expired) sessions, 'expired' for ended sessions.
     */
    status?: "active" | "expired" | undefined;

    /**
     * Optional filter on originating IP address for session records.
     * Supports partial matching to enable searching for a subnet or
     * specific address.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * (Optional) Restrict results to sessions with creation (login) time
     * after or on this value (inclusive). Must be in ISO 8601 format.
     */
    login_time_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * (Optional) Restrict results to sessions with creation (login) time
     * before or on this value (inclusive). Must be in ISO 8601 format.
     */
    login_time_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Session ordering criterion. Choose created_at for most recent logins
     * or expired_at for last-closed sessions.
     */
    order_by?: "created_at" | "expired_at" | undefined;

    /**
     * Sort direction for results: ascending or descending by the 'order_by'
     * field.
     */
    order_direction?: "asc" | "desc" | undefined;

    /**
     * Page number for pagination. Must be >= 1. Defaults to 1 if not
     * provided.
     */
    page: number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>;

    /**
     * Maximum records per page. Defaults to 20; must not exceed 100 in a
     * request.
     */
    limit: number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>;
  };

  /**
   * Summary DTO for an administrator authentication session in the shopping
   * mall backend. Used in API responses for session index/list and detail
   * endpoints, as well as for embedding authentication session context within
   * audit logs, security analysis, and privileged activity monitoring.
   * Contains only non-sensitive session metadata; does NOT expose session
   * tokens, credential material, or MFA details.
   *
   * This summary type is optimized for embedding in higher-level admin
   * activity logs, incident reports, and platform security reviews. In
   * scenarios where the summary appears in admin session or audit record
   * lists, the 'shopping_admin_id' is typically replaced by a fully embedded
   * IShoppingAdmin.ISummary object (not plain UUID), following platform
   * summary reference rules for traceability, actor auditability, and
   * incident investigation requirements.
   *
   * Fields provide context for identifying the owner of each session, the
   * origin IP, connection metadata (href, referrer), lifecycle timestamps
   * (creation, expiration), and are designed to fully support audit reporting
   * and platform compliance. All properties are strictly non-secret and
   * reference-only—no property in ISummary can ever be used for credential
   * validation or session token retrieval.
   *
   * Detailed property notes:
   *
   * - Id: UUID primary key for the session record, ensuring global uniqueness
   *   and anchoring all audit, search, and trace operations.
   * - Shopping_admin_id: In list/detail contexts, this property may be returned
   *   either as the admin's UUID (for simple listing) or as an embedded
   *   IShoppingAdmin.ISummary for cross-context relationship embedding. When
   *   embedding, context objects must resolve to the summary schema,
   *   providing full traceability for actor actions and session correlations
   *   in admin operations.
   * - Ip: The originating IP address where the session was initiated; used for
   *   security audits, abuse detection, and compliance checks. Follows IPv4
   *   (or business system dual-stack) string format. Mask/omit as per policy
   *   in export or public dashboards.
   * - Href: Original page or application endpoint where the session login
   *   occurred; vital for tracking origin in security reports, incident
   *   tracing, and diagnostics. Included as-is from session record.
   * - Referrer: HTTP referrer or logical navigation source present in session
   *   startup; provides context for login/journey flows and is used in
   *   system-level tracing, fraud, and incident investigations.
   * - Created_at: UTC timestamp of session creation. Used for last login
   *   displays, session lifetime analysis, and incident/abuse investigation.
   * - Expired_at: Either null (session open/current), or ISO UTC timestamp
   *   denoting when the session was explicitly closed or timed out (for
   *   expired and audit history entries). Used for tracking most recent
   *   usage, risk assessments, and abandoned session monitoring.
   */
  export type ISummary = {
    /**
     * Unique session record identifier (UUID PK from
     * shopping_admin_sessions). Used as canonical reference in all
     * security, audit, and monitoring reporting.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Reference to administrator actor (shopping_admins.id). In some
     * embedding scenarios, this may be replaced by the full
     * IShoppingAdmin.ISummary object for cross-context lookup (see ISummary
     * property composition rules).
     */
    shopping_admin_id: string & tags.Format<"uuid">;

    /**
     * Originating IP address for this session. Used to trace login context,
     * abuse, or suspicious activity. Collected at session creation and only
     * visible in privileged dashboards (not user-facing APIs). May be
     * masked per privacy/export restrictions.
     */
    ip: string & tags.Format<"ipv4">;

    /**
     * Original login URL/context for session entry. Used for diagnostics
     * and context auditing; collected at session creation for full audit
     * trace.
     */
    href: string;

    /**
     * HTTP referrer header or journey source present at session start. Used
     * for login path tracing and fraud investigation.
     */
    referrer: string;

    /**
     * Timestamp at which session was established. Used for login event
     * correlation, reporting, audit history, and session analytics.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * If session was explicitly closed, this is the UTC ISO timestamp when
     * closure occurred. Null if session is still open/active. Used for
     * security reporting, incident review, and session state tracking.
     */
    expired_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
