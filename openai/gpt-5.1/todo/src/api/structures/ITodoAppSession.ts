import { tags } from "typia";

export namespace ITodoAppSession {
  /**
   * Search and filtering request for listing authentication sessions of the
   * current actor in the TodoApp service.
   *
   * This DTO is used by the PATCH /todoApp/memberUser/actors/current/sessions
   * endpoint to express complex search criteria and pagination options for
   * sessions backed by the todo_app_memberuser_sessions and
   * todo_app_adminuser_sessions tables. It never carries any actor identity
   * because the current member or admin is resolved from authentication
   * context.
   *
   * The properties focus on pagination controls and optional filters such as
   * IP address and time ranges for creation and expiry. All filters are
   * optional so that clients can request the default view by omitting them,
   * while still having the ability to narrow results when needed.
   */
  export type IRequest = {
    /**
     * Zero-based page index for pagination.
     *
     * This value selects which slice of the result set to return when
     * combined with the limit property. Page 0 corresponds to the first
     * page of results. If omitted, the backend applies a sensible default,
     * typically the first page.
     *
     * Clients should treat this as a non-negative integer. Values less than
     * 0 are considered invalid and will result in a validation error.
     */
    page: number & tags.Type<"int32">;

    /**
     * Maximum number of session records to return in a single page.
     *
     * This value controls the page size for the paginated session list.
     * When not provided, the server uses a default limit that balances
     * responsiveness and payload size. Excessively large values may be
     * clamped to a server-defined maximum to protect performance.
     *
     * Clients should use moderate values to keep responses efficient while
     * minimizing the number of round trips needed to navigate all
     * sessions.
     */
    limit: number & tags.Type<"int32">;

    /**
     * Optional filter for the client IP address associated with sessions.
     *
     * When provided, the backend narrows results to sessions whose stored
     * ip column matches the specified value, typically using an exact
     * match. This helps users inspect where they have signed in from a
     * particular address.
     *
     * Use null or omit the property to avoid filtering on IP and return
     * sessions regardless of their originating address.
     */
    ip?: string | null | undefined;

    /**
     * Lower bound of the session creation time range filter.
     *
     * When specified, only sessions whose created_at timestamp is greater
     * than or equal to this value are included in the result set. The value
     * must be an ISO 8601 date-time string.
     *
     * Set to null or omit the property to avoid constraining the lower
     * bound of creation time.
     */
    createdFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Upper bound of the session creation time range filter.
     *
     * When provided, only sessions whose created_at timestamp is less than
     * or equal to this value are returned. The value must be an ISO 8601
     * date-time string.
     *
     * Set to null or omit the property to disable the upper bound filter on
     * creation time.
     */
    createdTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Lower bound of the session expiry time range filter.
     *
     * When provided, this constraint selects sessions where the expired_at
     * timestamp is greater than or equal to the given date-time, allowing
     * clients to focus on sessions that expired after a certain moment.
     *
     * Set to null or omit the property to avoid filtering by the lower
     * bound of expiry time.
     */
    expiredFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Upper bound of the session expiry time range filter.
     *
     * When specified, only sessions whose expired_at timestamp is less than
     * or equal to this date-time are included. This can be used together
     * with expiredFrom to isolate sessions that ended within a particular
     * window.
     *
     * Set to null or omit the property to disable the upper bound filter on
     * expiry time.
     */
    expiredTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Flag indicating whether to restrict the result to currently active
     * sessions only.
     *
     * When true, the backend returns only sessions that are considered
     * active, typically those where expired_at is null or in the future
     * according to business rules. When false or null, both active and
     * historical sessions may be included, depending on other filters.
     *
     * Use this flag to implement views such as "currently active logins"
     * where the user wants to see only sessions that have not yet expired.
     */
    activeOnly?: boolean | null | undefined;
  };

  /**
   * Unified summary view of an authenticated session within the todoApp
   * service.
   *
   * This DTO abstracts over actor-specific session tables, allowing clients
   * and internal tools to render session information without needing to know
   * whether the session belongs to a member user or an admin user. It is
   * designed for list and dashboard contexts where a concise overview of
   * session identity, actor type, connection context, and lifecycle is
   * sufficient.
   *
   * The schema intentionally includes only stable, non-sensitive fields: a
   * unique session identifier, an actor type discriminator, the owning actor
   * identifier, basic network context, and key timestamps. This makes it
   * suitable for security monitoring, audit logs, and administration UIs
   * while avoiding exposure of implementation details or secrets.
   */
  export type ISummary = {
    /**
     * Unique identifier of the session record.
     *
     * For member sessions this corresponds to
     * `todo_app_memberuser_sessions.id`, and for admin sessions it maps to
     * `todo_app_adminuser_sessions.id`. It is used as the canonical key
     * when listing or managing sessions across actor types.
     */
    id: string & tags.Format<"uuid">;

    /**
     * High-level classification of the actor who owns this session.
     *
     * Typical values are `"member"` for regular end users sourced from
     * `todo_app_memberuser_sessions`, and `"admin"` for administrative
     * operators sourced from `todo_app_adminuser_sessions`. This
     * discriminator allows clients to distinguish and filter sessions by
     * actor category.
     */
    actor_type: string;

    /**
     * Identifier of the actor who owns this session.
     *
     * For member sessions this is the
     * `todo_app_memberuser_sessions.todo_app_memberuser_id` value pointing
     * into `todo_app_memberusers`, and for admin sessions it is
     * `todo_app_adminuser_sessions.todo_app_adminuser_id` pointing into
     * `todo_app_adminusers`. It enables correlation between session records
     * and their owning accounts.
     */
    actor_id: string & tags.Format<"uuid">;

    /**
     * IP address recorded when the session was created.
     *
     * For member sessions the value mirrors
     * `todo_app_memberuser_sessions.ip`, and for administrative sessions it
     * mirrors `todo_app_adminuser_sessions.ip`. It provides the primary
     * network-level indicator used in security monitoring and anomaly
     * detection.
     */
    ip: string;

    /**
     * Full URL (href) that was accessed when the session was created.
     *
     * This property reflects either `todo_app_memberuser_sessions.href` or
     * `todo_app_adminuser_sessions.href` depending on actor type. It
     * describes the concrete entry point into the application at
     * authentication time.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL reported by the client at session creation time.
     *
     * It corresponds to the `referrer` field in the underlying session
     * table and indicates the previous page or origin that led the actor to
     * the login or protected route.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Timestamp indicating when the session was created.
     *
     * For member users this value is taken from
     * `todo_app_memberuser_sessions.created_at`, and for admins from
     * `todo_app_adminuser_sessions.created_at`. It marks the start of the
     * authenticated interaction window.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the session expired or was explicitly terminated, or
     * null if it is still active.
     *
     * Aligned with the `expired_at` column of the underlying session table,
     * this field allows consumers to determine session validity and to
     * filter or highlight sessions that are no longer in effect.
     */
    expired_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
