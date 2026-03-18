import { tags } from "typia";

import { IHrmsOrganization } from "./IHrmsOrganization";

export namespace IHrmsMemberSession {
  /**
   * Lightweight session summary for listing and browsing operations. Contains session metadata including connection details (IP, user agent, referrer), timestamps, and current organization context. Does not include sensitive authentication tokens.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property hrms_member_id
     */
    hrms_member_id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property current_organization_id
     */
    current_organization_id: (string & tags.Format<"uuid">) | null;
    /**
     * @x-autobe-database-schema-property currentOrganization
     */
    currentOrganization: IHrmsOrganization.ISummary | null;
    /**
     * @x-autobe-database-schema-property ip
     */
    ip: string;
    /**
     * @x-autobe-database-schema-property href
     */
    href: string;
    /**
     * @x-autobe-database-schema-property referrer
     */
    referrer: string;
    /**
     * @x-autobe-database-schema-property user_agent
     */
    user_agent: string;
    /**
     * @x-autobe-database-schema-property created_at
     */
    created_at: string & tags.Format<"date-time">;
    /**
     * @x-autobe-database-schema-property expired_at
     */
    expired_at: string & tags.Format<"date-time">;
  };

  /**
   * Request parameters for listing and filtering member authentication sessions.
   *
   * Contains pagination settings, date range filters, search criteria, and sorting options for querying member sessions across different devices and browsers. All properties are query parameters used to construct the filtered list query.
   */
  export type IRequest = {
    /**
     * Page number for pagination (1-indexed).
     *
     * Indicates which page of results is currently being requested. Page numbering starts from 1, so the first page is page 1.
     *
     * @x-autobe-specification Computed query parameter: page number for pagination. Defaults to 1 if not provided or less than 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page (1-100).
     *
     * Controls the page size for the paginated response. Must be between 1 and 100 to prevent excessive resource usage.
     *
     * @x-autobe-specification Computed query parameter: page size limit. Defaults to a reasonable default (e.g., 10 or 20) if not provided. Must be clamped to 1-100 range.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter sessions by current organization context.
     *
     * Optional UUID to filter sessions by the organization the member was using when the session was created. Null means all organizations.
     *
     * @x-autobe-specification Computed query parameter: filters hrms_member_sessions.current_organization_id to match this UUID. Null or omitted means no organization filter.
     */
    currentOrganizationId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter sessions created after this timestamp (inclusive).
     *
     * Optional date-time filter for session creation date. Only sessions with created_at >= this value will be returned.
     *
     * @x-autobe-specification Computed query parameter: filters hrms_member_sessions.created_at >= this timestamp. Optional, null or omitted means no lower bound.
     */
    createdFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions created before this timestamp (inclusive).
     *
     * Optional date-time filter for session creation date. Only sessions with created_at <= this value will be returned.
     *
     * @x-autobe-specification Computed query parameter: filters hrms_member_sessions.created_at <= this timestamp. Optional, null or omitted means no upper bound.
     */
    createdTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions expired after this timestamp (inclusive).
     *
     * Optional date-time filter for session expiration date. Only sessions with expired_at >= this value will be returned. Useful for finding expired sessions.
     *
     * @x-autobe-specification Computed query parameter: filters hrms_member_sessions.expired_at >= this timestamp. Optional, null or omitted means no lower bound.
     */
    expiredFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions expired before this timestamp (inclusive).
     *
     * Optional date-time filter for session expiration date. Only sessions with expired_at <= this value will be returned. Useful for finding expired sessions.
     *
     * @x-autobe-specification Computed query parameter: filters hrms_member_sessions.expired_at <= this timestamp. Optional, null or omitted means no upper bound.
     */
    expiredTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Search text in IP address and user agent fields.
     *
     * Optional text search that matches against ip and user_agent columns using LIKE or full-text search.
     *
     * @x-autobe-specification Computed query parameter: applies text search to ip || ' ' || user_agent fields. Optional, null or omitted means no search filter.
     */
    search?: (string & tags.MaxLength<255>) | undefined;

    /**
     * Field to sort results by.
     *
     * Specifies which column to sort by: created_at, expired_at, ip, or user_agent. Must be one of these field names.
     *
     * @x-autobe-specification Computed query parameter: maps to ORDER BY hrms_member_sessions.{sort_field}. Defaults to created_at DESC if not provided.
     */
    sort?: string | undefined;

    /**
     * Sort order direction: ascending or descending.
     *
     * Specifies the sort order: 'asc' for ascending or 'desc' for descending.
     *
     * @x-autobe-specification Computed query parameter: ORDER BY direction. Defaults to 'desc' if not provided.
     */
    order?: "asc" | "desc" | undefined;
  };
}
