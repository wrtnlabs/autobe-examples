import { tags } from "typia";

import { IMultiUserTodoGuest } from "./IMultiUserTodoGuest";

export namespace IMultiUserTodoGuestSession {
  /**
   * Request parameters for filtering and paginating guest session listings. Supports date range filtering by creation time, expiration status filtering, and pagination.
   */
  export type IRequest = {
    /**
     * Page number for pagination (1-indexed)
     *
     * @x-autobe-specification Page number for cursor-based pagination. 1-indexed, defaults to 1 if omitted. Not stored in database - computed query parameter.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page
     *
     * @x-autobe-specification Maximum number of records per page. Defaults to server-configured value if omitted. Maximum 100. Not stored in database - computed query parameter.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter sessions created on or after this timestamp
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Filter sessions where created_at >= this timestamp. ISO 8601 date-time format. Maps to multi_user_todo_guest_sessions.created_at column.
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions created on or before this timestamp
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Filter sessions where created_at <= this timestamp. ISO 8601 date-time format. Maps to multi_user_todo_guest_sessions.created_at column.
     */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter by expiration status: true for expired sessions, false for active sessions
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Filter by expiration status. true = expired sessions (expired_at < now), false = active sessions (expired_at >= now). Maps to multi_user_todo_guest_sessions.expired_at column comparison.
     */
    expired?: boolean | undefined;
  };

  /**
   * Lightweight guest session summary for list views. Includes session metadata (IP, URLs, timestamps) and associated guest information.
   */
  export type ISummary = {
    /**
     * Unique identifier for the guest session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from multi_user_todo_guest_sessions.id. UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Client IP address for session tracking and security.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from multi_user_todo_guest_sessions.ip. Captured at session creation.
     */
    ip: string;

    /**
     * Current page URL when session was created.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from multi_user_todo_guest_sessions.href. URI format.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL for session origin tracking.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from multi_user_todo_guest_sessions.referrer. URI format.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Session creation timestamp.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from multi_user_todo_guest_sessions.created_at. ISO 8601 date-time format.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Session expiration timestamp for automatic invalidation.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from multi_user_todo_guest_sessions.expired_at. ISO 8601 date-time format.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * Associated guest account information.
     *
     * @x-autobe-database-schema-property guest
     * @x-autobe-specification Join via multi_user_todo_guests_id to multi_user_todo_guests. Returns IMultiUserTodoGuest.ISummary.
     */
    guest: IMultiUserTodoGuest.ISummary;
  };
}
