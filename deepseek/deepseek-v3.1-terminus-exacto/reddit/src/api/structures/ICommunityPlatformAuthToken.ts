import { tags } from "typia";

export namespace ICommunityPlatformAuthToken {
  /**
   * Lightweight summary of authentication tokens for administrative review and management. Includes essential token metadata such as token type, creation timestamp, expiration status, usage information, and deletion status. Designed for efficient listing operations where detailed token values and verbose metadata are not required.
   */
  export type ISummary = {
    /**
     * Unique identifier for the authentication token
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_auth_tokens.id. UUID primary key for unique token identification.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of authentication token indicating its purpose and usage context
     *
     * @x-autobe-database-schema-property token_type
     * @x-autobe-specification Direct mapping from community_platform_auth_tokens.token_type. Indicates the token's purpose (email_verification, password_reset, etc.).
     */
    token_type: string;

    /**
     * Timestamp when the token was created
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from community_platform_auth_tokens.created_at. Timestamp when the token was generated and stored.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the token expires and becomes invalid
     *
     * @x-autobe-database-schema-property expires_at
     * @x-autobe-specification Direct mapping from community_platform_auth_tokens.expires_at. Timestamp when the token becomes invalid and cannot be used.
     */
    expires_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the token was used, null if still unused
     *
     * @x-autobe-database-schema-property used_at
     * @x-autobe-specification Direct mapping from community_platform_auth_tokens.used_at. Timestamp when the token was successfully used for authentication, null if unused.
     */
    used_at: (string & tags.Format<"date-time">) | null;

    /**
     * Timestamp when the token was deleted, null if still active
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from community_platform_auth_tokens.deleted_at. Timestamp when the token was soft deleted, null if active.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };

  /**
   * Sanitized authentication token metadata for administrative reference and audit purposes. Provides comprehensive token lifecycle information including type, timestamps, expiration, and usage tracking while protecting sensitive cryptographic values. Administrators can monitor token validity periods and security metadata without accessing actual token credentials.
   */
  export type IReference = {
    /**
     * Unique identifier for the authentication token record
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_auth_tokens.id. UUID primary key uniquely identifying this authentication token record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of authentication token indicating its purpose and usage context
     *
     * @x-autobe-database-schema-property token_type
     * @x-autobe-specification Direct mapping from community_platform_auth_tokens.token_type. Indicates the token's purpose and usage context (e.g., email verification, password reset, session token).
     */
    token_type: string;

    /**
     * Timestamp when the authentication token was created
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from community_platform_auth_tokens.created_at. Timestamp when the token was generated and stored in the system.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the token record was last updated
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from community_platform_auth_tokens.updated_at. Timestamp when the token record was last modified.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the token was soft deleted, or null if still active
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from community_platform_auth_tokens.deleted_at. Timestamp when the token was soft deleted, or null if still active. Supports soft deletion workflow for token management.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp when the authentication token expires and becomes invalid
     *
     * @x-autobe-database-schema-property expires_at
     * @x-autobe-specification Direct mapping from community_platform_auth_tokens.expires_at. Timestamp when the token becomes invalid and cannot be used for authentication.
     */
    expires_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the token was successfully used, or null if never used
     *
     * @x-autobe-database-schema-property used_at
     * @x-autobe-specification Direct mapping from community_platform_auth_tokens.used_at. Timestamp when the token was successfully used for authentication, or null if never used.
     */
    used_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * IP address from which the token was requested for security tracking
     *
     * @x-autobe-database-schema-property ip_address
     * @x-autobe-specification Direct mapping from community_platform_auth_tokens.ip_address. IP address from which the token was requested for security tracking and audit purposes.
     */
    ip_address?: (string & tags.Format<"ipv4">) | null | undefined;

    /**
     * User agent string from the device that requested the token
     *
     * @x-autobe-database-schema-property user_agent
     * @x-autobe-specification Direct mapping from community_platform_auth_tokens.user_agent. User agent string from the requesting device for audit and security analysis purposes.
     */
    user_agent?: string | null | undefined;
  };

  /**
   * Request parameters for searching authentication tokens with advanced filtering capabilities. Supports filtering by token type, expiration status, usage status, creation date ranges, and soft deletion status. Includes pagination parameters for large result sets. Intended for administrative token management and security monitoring.
   */
  export type IRequest = {
    /**
     * Filter by exact token type (email_verification, password_reset, etc.)
     *
     * @x-autobe-database-schema-property token_type
     */
    token_type?: string | undefined;

    /**
     * Filter tokens expiring before this date
     *
     * @x-autobe-specification Filter parameter for tokens expiring before specified date. Computed from comparison with expires_at column.
     */
    expires_at_before?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter tokens expiring after this date
     *
     * @x-autobe-specification Filter parameter for tokens expiring after specified date. Computed from comparison with expires_at column.
     */
    expires_at_after?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter by usage status: 'unused' for null used_at, 'used' for non-null
     *
     * @x-autobe-database-schema-property used_at
     */
    used_at?: "unused" | "used" | null | undefined;

    /**
     * Filter tokens created before this date
     *
     * @x-autobe-specification Filter parameter for tokens created before specified date. Computed from comparison with created_at column.
     */
    created_at_before?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter tokens created after this date
     *
     * @x-autobe-specification Filter parameter for tokens created after specified date. Computed from comparison with created_at column.
     */
    created_at_after?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter by soft deletion status: 'active' for null deleted_at, 'deleted' for non-null
     *
     * @x-autobe-database-schema-property deleted_at
     */
    deleted_at?: "active" | "deleted" | null | undefined;

    /**
     * Page number for pagination
     *
     * @x-autobe-specification Pagination parameter for page number. Computed for query offset calculation.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page
     *
     * @x-autobe-specification Pagination parameter for items per page. Computed for query limit calculation.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
