import { tags } from "typia";

export namespace ITodoAppUserSession {
  /**
   * Search and pagination parameters for retrieving user session records for administrative auditing. Used to filter session data based on user identifier, creation timestamp range, IP address, expiration status, and session status with cursor-based pagination for efficient large-scale data retrieval.
   */
  export type IRequest = {
    /**
     * Unique identifier of the user whose authentication sessions are being searched.
     *
     * @x-autobe-database-schema-property user_id
     * @x-autobe-specification Direct mapping from todo_app_user_sessions.user_id column. UUID of the user whose sessions are being queried.
     */
    user_id: string & tags.Format<"uuid">;

    /**
     * Start timestamp for filtering sessions by creation date. Only sessions created on or after this time will be included.
     *
     * @x-autobe-specification Filter parameter for session creation date range. Client provides start timestamp to filter sessions created on or after this time. Not a database column - server compares this value against todo_app_user_sessions.created_at field in query.
     */
    created_at_start: string & tags.Format<"date-time">;

    /**
     * End timestamp for filtering sessions by creation date. Only sessions created on or before this time will be included.
     *
     * @x-autobe-specification Filter parameter for session creation date range. Client provides end timestamp to filter sessions created on or before this time. Not a database column - server compares this value against todo_app_user_sessions.created_at field in query.
     */
    created_at_end: string & tags.Format<"date-time">;

    /**
     * IP address of the client device used for the session. Filters sessions originating from this specific IP address.
     *
     * @x-autobe-specification Filter parameter for client IP address. Client provides IP to filter sessions originating from this address. Not a database column - server compares this value against todo_app_user_sessions.ip_address field in query.
     */
    ip_address: string & tags.Format<"ipv4">;

    /**
     * Expiration timestamp for filtering sessions. Filters sessions that expire at or before this time.
     *
     * @x-autobe-specification Filter parameter for session expiration. Client provides timestamp to filter sessions that expire at or before this time. Not a database column - server compares this value against todo_app_user_sessions.expires_at field in query.
     */
    expires_at: string & tags.Format<"date-time">;

    /**
     * Current status of the session. Can be 'active', 'expired', or 'revoked'. Filters sessions matching this specific status.
     *
     * @x-autobe-specification Filter parameter for session status. Client provides status value (active/expired/revoked) to filter sessions. Not a database column - server compares this value against todo_app_user_sessions.status field in query.
     */
    status: "active" | "expired" | "revoked";

    /**
     * Cursor token for navigating through paginated results. Used to fetch the next set of records after the current page.
     *
     * @x-autobe-specification Cursor value for cursor-based pagination. Specifies a reference point from which to return the next set of results. This is an opaque string returned in the pagination metadata of the previous response.
     */
    cursor: string;

    /**
     * Maximum number of session records to return per page. Must be between 1 and 1000. Controls pagination size.
     *
     * @x-autobe-specification Pagination limit parameter. Controls the maximum number of records returned per page (1-1000). This is a client-specified parameter, not a database column.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>;
  };

  /**
   * Summary representation of user session information for auditing and security monitoring. Contains only non-sensitive metadata about user authentication events including the user identifier, client IP address, user agent details, session creation time, expiration time, and current status. This lightweight representation is optimized for list views in security dashboards and audit logs while excluding sensitive authentication tokens to prevent credential exposure.
   */
  export type ISummary = {
    /**
     * The IPv4 address from which the session was initiated.
     *
     * @x-autobe-specification Computed from application-level session context. Captures client IP address at time of session creation.
     */
    ipAddress: string & tags.Format<"ipv4">;

    /**
     * The full user-agent string identifying the client device and browser.
     *
     * @x-autobe-specification Computed from application-level session context. Captures user-agent string from client HTTP request header.
     */
    userAgent: string;

    /**
     * Timestamp when the session was created, in ISO 8601 format.
     *
     * @x-autobe-specification Computed from application-level session context. Timestamp when session was created by the authentication service.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when this session will expire, in ISO 8601 format.
     *
     * @x-autobe-specification Computed from application-level session context. Timestamp when this session will expire based on token expiration policy.
     */
    expiresAt: string & tags.Format<"date-time">;

    /**
     * The current status of the session, which can be active, expired, or revoked.
     *
     * @x-autobe-specification Computed from application-level session context. Status determined by token validity and revocation state.
     */
    status: "active" | "expired" | "revoked";

    /**
     * Unique identifier for the user owning this session.
     *
     * @x-autobe-database-schema-property user_id
     * @x-autobe-specification Direct mapping from todo_app_user_sessions.user_id column. UUID identifier for the authenticated user.
     */
    userId: string & tags.Format<"uuid">;
  };
}
