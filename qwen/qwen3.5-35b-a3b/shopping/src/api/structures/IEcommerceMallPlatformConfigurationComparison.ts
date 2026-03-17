import { tags } from "typia";

export namespace IEcommerceMallPlatformConfigurationComparison {
  /**
   * Request body for comparing platform configuration values across different deployment environments. Specifies which environments to compare, with optional filtering by configuration key patterns and active/inactive status. All properties are query parameters used to filter and paginate configuration comparison results.
   */
  export type IRequest = {
    /**
     * Array of environment scope identifiers to compare. Must contain at least one environment scope (e.g., ['staging', 'production']). This filter determines which environments' configuration values will be compared side-by-side.
     *
     * @x-autobe-specification Parsed from request body. Filter environments from ecommerce_mall_platform_configuration_values by this list. Must have at least 1 value. Values correspond to the 'scope' column in ecommerce_mall_platform_configurations and 'environment_scope' in ecommerce_mall_platform_configuration_values.
     */
    environmentScopes: string[] & tags.MinItems<1>;

    /**
     * Optional array of specific configuration keys to include in the comparison. When null or not provided, all configurations matching other filters are included. Useful for filtering by specific configuration patterns or named keys.
     *
     * @x-autobe-specification Parsed from request body. Filter configurations from ecommerce_mall_platform_configurations where configuration_key is IN this array when provided. If null/undefined, no key filtering is applied.
     */
    configurationKeys?: string[] | undefined;

    /**
     * Optional boolean flag to filter configurations by their active status. When true, only active configurations are returned. When false, only inactive configurations are returned. When not provided, all configurations are included regardless of isActive status.
     *
     * @x-autobe-specification Parsed from request body. Filter ecommerce_mall_platform_configurations where is_active matches this boolean value when provided. If null/undefined, no active status filtering is applied.
     */
    isActive?: boolean | undefined;

    /**
     * Target page number to retrieve (1-indexed). Specifies which page of comparison results to return. Defaults to page 1 if not provided. Requesting a page beyond available range returns empty data with valid pagination metadata.
     *
     * @x-autobe-specification Parsed from request body. Controls pagination of results. 1-indexed page number. Defaults to 1 if not provided. Used with limit to determine OFFSET for database query results.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page. Controls how many configuration entries are included in each page response. Defaults to 100 records per page if not provided. Server may enforce upper bounds to prevent excessive resource consumption.
     *
     * @x-autobe-specification Parsed from request body. Controls pagination batch size. Maximum records per page. Defaults to 100 if not provided. Combined with page determines OFFSET and LIMIT for database query.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Summary representation of a platform configuration showing its metadata along with current values across multiple deployment environments (staging, production, etc.). Used by administrators to compare configuration differences between scopes and identify inconsistencies. Each row represents one configuration definition with its environment-specific values aggregated into environmentValues object.
   */
  export type ISummary = {
    /**
     * Unique identifier for the platform configuration.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_platform_configurations.id. UUID primary key uniquely identifying the configuration definition.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique configuration identifier key name.
     *
     * @x-autobe-database-schema-property configuration_key
     * @x-autobe-specification Direct mapping from ecommerce_mall_platform_configurations.configuration_key. Unique string identifier for the configuration (e.g., 'max_upload_size', 'enable_guest_access').
     */
    key: string;

    /**
     * Human-readable description of the configuration's purpose.
     *
     * @x-autobe-database-schema-property description
     * @x-autobe-specification Direct mapping from ecommerce_mall_platform_configurations.description. Human-readable text describing what this configuration controls.
     */
    description: string;

    /**
     * Data type of the configuration value.
     *
     * @x-autobe-database-schema-property configuration_type
     * @x-autobe-specification Direct mapping from ecommerce_mall_platform_configurations.configuration_type. Enum/string indicating the value type (string, integer, boolean, json).
     */
    type: string;

    /**
     * Whether this configuration is currently active.
     *
     * @x-autobe-database-schema-property is_active
     * @x-autobe-specification Direct mapping from ecommerce_mall_platform_configurations.is_active. Boolean indicating whether the configuration is currently active in the system.
     */
    isActive: boolean;

    /**
     * Current values of this configuration across deployment environments, keyed by environment scope (e.g., staging, production).
     *
     * @x-autobe-specification Computed field: Aggregation from ecommerce_mall_platform_configuration_values joined on configuration_id, grouped by configuration id. Each key in the object is an environment_scope (e.g., 'staging', 'production') and each value is the corresponding configuration value. Values are typed as string|number|boolean|null based on configuration_type.
     */
    environmentValues: {
      [key: string]: string | number | boolean | null;
    };

    /**
     * Creation timestamp for the configuration.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_platform_configurations.created_at. Timestamp when this configuration record was created.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last modification timestamp.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_platform_configurations.updated_at. Timestamp of the last modification to this configuration.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft-deletion timestamp, null if the configuration is active.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_platform_configurations.deleted_at. Nullable timestamp for soft deletion; null indicates the configuration is active and not deleted.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };
}
