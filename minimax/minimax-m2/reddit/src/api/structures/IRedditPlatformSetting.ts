import { tags } from "typia";

export namespace IRedditPlatformSetting {
  /**
   * Secure search and filtering parameters for retrieving platform settings
   * with comprehensive validation and authentication protection.
   *
   * This type defines all available filtering, sorting, and pagination
   * options for querying platform settings in administrative interfaces.
   * Supports filtering by setting keys, data types, visibility status, and
   * keyword searches in descriptions with strict input validation and
   * sanitization.
   *
   * Pagination parameters allow efficient retrieval of large setting
   * collections with configurable page sizes and rate limiting protection.
   * Sorting options enable ordering by various attributes including creation
   * date, modification time, key name, and data type with safe field
   * whitelisting.
   *
   * Search functionality supports partial matching on keys and descriptions
   * with XSS and injection prevention. Filters can be combined for precise
   * targeting of settings matching multiple criteria while preventing query
   * manipulation attacks.
   *
   * Authentication context is automatically extracted from verified JWT
   * tokens and never accepted from request bodies, preventing impersonation
   * attacks. System-managed fields like created_at and updated_at are
   * protected from client manipulation.
   *
   * This query type integrates with the platform settings search system and
   * provides secure, authorized access to configuration data based on user
   * authorization level and operational requirements.
   */
  export type IRequest = {
    /**
     * Maximum number of settings to return in a single response, allowing
     * users to control response size and load times. Supports values from 1
     * to 100, with typical values being 25, 50, or 100 settings per page.
     * Subject to rate limiting to prevent API abuse.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Page number for pagination, starting from 1. Combined with limit to
     * calculate the offset for retrieving specific pages of results. Page 1
     * returns the first set of results. Page 0 is invalid.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Field by which to sort the returned settings. Supported values
     * include 'key' for alphabetically sorting by setting key, 'created_at'
     * for sorting by creation date, 'updated_at' for sorting by last
     * modification, and 'data_type' for grouping by data type. Only
     * whitelisted fields are accepted to prevent injection attacks.
     */
    sort_by?:
      | (string & tags.Pattern<"^(key|created_at|updated_at|data_type)$">)
      | undefined;

    /**
     * Sort direction for the results. Use 'asc' for ascending order (A-Z,
     * oldest to newest) or 'desc' for descending order (Z-A, newest to
     * oldest). Case-insensitive but normalized to lowercase.
     */
    order_by?: (string & tags.Pattern<"^(asc|desc)$">) | undefined;

    /**
     * Keyword search across setting keys and descriptions. Performs
     * case-insensitive partial matching to find settings containing the
     * specified search terms. Input is sanitized and escaped to prevent XSS
     * and injection attacks. Maximum length of 255 characters.
     */
    search?: (string & tags.MaxLength<255>) | undefined;

    /**
     * Filter settings by their data type category. Only return settings
     * that match the specified data type. Common values include 'string',
     * 'number', 'boolean', 'json', and 'email'. Only whitelisted data types
     * are accepted to prevent injection attacks.
     */
    data_type?:
      | (string & tags.Pattern<"^(string|number|boolean|json|email)$">)
      | undefined;

    /**
     * Filter settings by their visibility status. When true, only return
     * public settings (is_public = true) that are visible to regular users.
     * When false, only return private settings (is_public = false). When
     * null, return both public and private settings regardless of
     * visibility.
     */
    is_public?: boolean | undefined;
  };

  /**
   * Secure summary representation of platform configuration settings with
   * sensitive data protection.
   *
   * Lightweight view of system configuration parameters optimized for
   * administrative interfaces and user-facing setting displays. Contains key
   * identification and descriptive information without complex technical
   * details or sensitive internal data.
   *
   * Settings control various platform behaviors including feature flags,
   * system limits, and user-facing preferences. Public settings are visible
   * to regular users while private settings require administrative access
   * based on verified JWT authentication.
   *
   * System-managed fields like created_at and updated_at are automatically
   * generated and cannot be manipulated by clients. All field values are
   * validated and sanitized before display to prevent XSS and injection
   * attacks.
   *
   * Used for setting management interfaces, configuration overview displays,
   * and public setting lists where detailed configuration values require
   * proper authorization and security controls.
   */
  export type ISummary = {
    /** Unique identifier for the setting. */
    id: string & tags.Format<"uuid">;

    /**
     * Unique configuration key identifier for platform settings (e.g.,
     * 'max_upload_size', 'default_timezone'). Keys are validated against
     * safe naming patterns to prevent injection attacks.
     */
    key: string &
      tags.MinLength<1> &
      tags.MaxLength<255> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">;

    /**
     * Configuration value stored as string, can be parsed based on
     * data_type field. Values are sanitized and validated according to
     * their declared data type. Sensitive values like passwords or secrets
     * are never exposed in this field.
     */
    value: string & tags.MaxLength<65535>;

    /**
     * Human-readable description explaining what this setting controls and
     * its impact on the platform. Descriptions are sanitized to prevent XSS
     * attacks and HTML injection.
     */
    description: string & tags.MaxLength<1000>;

    /**
     * Data type of the configuration value (string, number, boolean, json,
     * etc.) for proper validation and parsing. Only whitelisted data types
     * are supported to ensure type safety.
     */
    data_type: string & tags.Pattern<"^(string|number|boolean|json|email)$">;

    /**
     * Whether this setting is visible to regular users in the interface or
     * only accessible to administrators. This field controls authorization
     * and access control decisions.
     */
    is_public: boolean;

    /**
     * Timestamp when the setting was initially created. This is a
     * system-managed field that is read-only and cannot be modified by
     * clients.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the setting was last modified. This is a
     * system-managed field that is read-only and cannot be modified by
     * clients.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
