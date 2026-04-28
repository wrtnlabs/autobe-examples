import { tags } from "typia";

import { IMultiUserTodoMember } from "./IMultiUserTodoMember";

export namespace IMultiUserTodoMemberPasswordReset {
  /**
   * Summary of a password reset token for administrative review and monitoring.
   *
   * This type represents a password reset request in list views and pagination responses. It includes the token metadata (expiration and creation timestamps) and associated member information for tracking and audit purposes.
   */
  export type ISummary = {
    /**
     * Unique identifier for the password reset token.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   multi_user_todo_member_password_resets.id (UUID).
     */
    id: string & tags.Format<"uuid">;

    /**
     * The member account associated with this password reset request.
     *
         * @x-autobe-database-schema-property member
         * @x-autobe-specification Join from
         *   multi_user_todo_member_password_resets.member_id to
         *   multi_user_todo_members.id. Returns IMultiUserTodoMember.ISummary
         *   for the associated member.
     */
    member: IMultiUserTodoMember.ISummary;

    /**
     * Timestamp when this password reset token expires and becomes invalid.
     *
         * @x-autobe-database-schema-property expired_at
         * @x-autobe-specification Direct mapping from
         *   multi_user_todo_member_password_resets.expired_at (timestamp with
         *   time zone).
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this password reset token was created.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   multi_user_todo_member_password_resets.created_at (timestamp with
         *   time zone).
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this password reset token was last updated.
     *
         * @x-autobe-database-schema-property updated_at
         * @x-autobe-specification Direct mapping from
         *   multi_user_todo_member_password_resets.updated_at (timestamp with
         *   time zone).
     */
    updated_at: string & tags.Format<"date-time">;
  };

  /**
   * Request parameters for listing and searching password reset requests with pagination, filtering, and sorting.
   *
   * This DTO defines the search and filter criteria for querying password reset tokens through the API. It supports content search by token, member association filtering, expiration status filtering, date range queries, pagination control, and sorting options.
   */
  export type IRequest = {
    /**
     * Searches across the `token` field using a LIKE operator for flexible pattern matching.
     *
     * Allows users to find password reset requests by searching part of the token string. Useful for administrative lookup when only part of a token is known.
     *
         * @x-autobe-specification LIKE query on
         *   multi_user_todo_member_password_resets.token field. Case-sensitive
         *   search across token value.
     */
    search?: string | undefined;

    /**
     * Filters results to a specific member's password reset requests by UUID.
     *
     * Only non-admin users can filter by their own member_id. Administrators can view any member's password reset requests.
     *
         * @x-autobe-database-schema-property member_id
         * @x-autobe-specification Exact match filter on
         *   multi_user_todo_member_password_resets.member_id column. Format:
         *   UUID string.
     */
    member_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filters results by expiration status.
     *
     * - `valid`: Only non-expired tokens where `expired_at > now`
     * - `expired`: Only expired tokens where `expired_at <= now`
     *
         * @x-autobe-specification Computed filter comparing expired_at
         *   timestamp with current time. 'valid' = expired_at > now, 'expired'
         *   = expired_at <= now.
     */
    status?: "valid" | "expired" | undefined;

    /**
     * Filters results by creation timestamp range.
     *
     * Returns password reset requests created within the specified date range (inclusive).
     *
         * @x-autobe-specification Date range filter on
         *   multi_user_todo_member_password_resets.created_at. Object with
         *   `gte` (greater than or equal) and `lte` (less than or equal) ISO
         *   8601 datetime strings. Both fields required.
     */
    created_at_range?:
      | {
          gte: string & tags.Format<"date-time">;
          lte: string & tags.Format<"date-time">;
        }
      | undefined;

    /**
     * Filters results by expiration timestamp range.
     *
     * Returns password reset requests that expire within the specified date range (inclusive).
     *
         * @x-autobe-specification Date range filter on
         *   multi_user_todo_member_password_resets.expired_at. Object with
         *   `gte` (greater than or equal) and `lte` (less than or equal) ISO
         *   8601 datetime strings. Both fields required.
     */
    expired_at_range?:
      | {
          gte: string & tags.Format<"date-time">;
          lte: string & tags.Format<"date-time">;
        }
      | undefined;

    /**
     * Current page number for pagination.
     *
     * Controls which page of results is returned. Page numbering starts from 1.
     *
         * @x-autobe-specification 1-indexed pagination offset. Minimum value is
         *   1. Used to calculate the starting position for the result set.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * Controls the size of each page in paginated responses.
     *
         * @x-autobe-specification Items per page. Minimum value is 1, maximum
         *   value is 100. Defaults to 20 if not specified.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Field to sort results by.
     *
     * Determines which column is used for ordering the results.
     *
         * @x-autobe-specification Sort column selection. Options: 'created_at'
         *   (sort by creation timestamp), 'expired_at' (sort by expiration
         *   timestamp). Defaults to 'created_at'.
     */
    sortBy?: "created_at" | "expired_at" | undefined;

    /**
     * Sort order direction for the results.
     *
     * Determines ascending or descending order for the sortBy field.
     *
         * @x-autobe-specification Sort direction selection. Options: 'asc'
         *   (ascending), 'desc' (descending). Defaults to 'desc' (most recent
         *   first).
     */
    sortOrder?: "asc" | "desc" | undefined;
  };

  /**
   * Password reset token metadata for administrative review and auditing purposes.
   *
   * This response provides comprehensive token information including creation timestamp, expiration timestamp, associated member account details, and current token status indicators. The actual reset token value is deliberately excluded from this endpoint for security reasons to prevent token exposure through administrative queries.
   *
   * ## Computed Status Fields
   *
   * The response includes three computed status indicators that help administrators assess token validity:
   *
   * - **isExpired**: A boolean indicating whether the current time has passed the token's expiration timestamp
   * - **isValid**: A boolean confirming the token still exists in the database (tokens are cascaded/deleted when used for password reset)
   * - **timeUntilExpirationSeconds**: An integer representing remaining seconds until expiration, or negative value if already expired
   *
   * ## Use Cases
   *
   * This endpoint serves administrative functions including security compliance auditing, password reset troubleshooting for support teams, monitoring token usage patterns, and support investigations requiring token status verification.
   */
  export type IAdminView = {
    /**
     * Unique identifier for this password reset token record.
     *
     * A UUID (Universally Unique Identifier) that serves as the primary key for the password reset token. This identifier is used to retrieve, reference, and audit individual token records in the database.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   multi_user_todo_member_password_resets.id (UUID primary key).
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique identifier for the member account associated with this password reset token.
     *
     * A UUID foreign key referencing the multi_user_todo_members table. Links this password reset token to a specific member account that requested the password reset.
     *
         * @x-autobe-database-schema-property member_id
         * @x-autobe-specification Direct mapping from
         *   multi_user_todo_member_password_resets.member_id (UUID foreign key
         *   to multi_user_todo_members.id).
     */
    memberId: string & tags.Format<"uuid">;

    /**
     * Email address of the member account associated with this password reset token.
     *
     * Retrieved via JOIN with multi_user_todo_members table using member_id foreign key. This email address identifies which member account the password reset token is intended for, without exposing other member profile details.
     *
         * @x-autobe-database-schema-property member
         * @x-autobe-specification JOIN from
         *   multi_user_todo_member_password_resets.member_id to
         *   multi_user_todo_members.id, returning member.email. This provides
         *   the member's email address associated with this password reset
         *   token.
     */
    memberEmail: string;

    /**
     * Timestamp indicating when this password reset token was initially created.
     *
     * An ISO 8601 formatted date-time value that records when the password reset token was generated and sent to the member's email address. This timestamp is critical for tracking token age and verifying token lifetime compliance.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   multi_user_todo_member_password_resets.created_at (timestamp with
         *   timezone).
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp indicating when this password reset token expires and becomes invalid.
     *
     * An ISO 8601 formatted date-time value that marks the end of the token's validity period. Once the current time exceeds this timestamp, the token cannot be used for password reset regardless of whether it has been used. Typical token lifetimes range from 1 to 24 hours depending on security policy.
     *
         * @x-autobe-database-schema-property expired_at
         * @x-autobe-specification Direct mapping from
         *   multi_user_todo_member_password_resets.expired_at (timestamp with
         *   timezone).
     */
    expiredAt: string & tags.Format<"date-time">;

    /**
     * Indicates whether this password reset token has expired based on current time.
     *
     * Computed by comparing the expired_at timestamp with the current time. Returns true if expired_at is in the past, false otherwise. This field enables administrators to quickly identify expired tokens without manual calculation.
     *
         * @x-autobe-specification Computed: expiredAt > current_time. Returns
         *   boolean true if the token's expired_at timestamp is less than the
         *   current datetime, false otherwise.
     */
    isExpired: boolean;

    /**
     * Indicates whether this password reset token is still valid and available for use.
     *
     * Computed based on token existence in the database. Tokens are immediately deleted (cascaded) when used for a password reset, so a token's existence in the database indicates it has not yet been used. Returns true if the token exists and is accessible, false if already used or deleted.
     *
         * @x-autobe-specification Computed: token exists in database. Returns
         *   boolean true if the password reset token record is present in
         *   multi_user_todo_member_password_resets table (not yet
         *   used/deleted), false if already used (tokens are cascaded when
         *   used).
     */
    isValid: boolean;

    /**
     * Remaining time until the password reset token expires, expressed in seconds.
     *
     * An integer value representing the number of seconds between the current time and the expired_at timestamp. Positive values indicate time remaining, zero indicates immediate expiration, and negative values indicate how many seconds past expiration the token has been. This field provides administrators with precise token lifecycle timing without manual calculation.
     *
         * @x-autobe-specification Computed: expiredAt - current_time, converted
         *   to integer seconds. Returns positive value for tokens not yet
         *   expired, zero for tokens expiring immediately, and negative value
         *   for already expired tokens.
     */
    timeUntilExpirationSeconds: number & tags.Type<"int32">;
  };
}
