import { tags } from "typia";

export namespace ITodoAppSystemSettings {
  /**
   * A summary view of system configuration settings for administrative
   * management and operational monitoring.
   *
   * This condensed representation provides key identification, current
   * status, and scope information for system settings while avoiding detailed
   * configuration data that's better displayed in full detail views.
   *
   * Used for administrative dashboard displays and configuration overview
   * interfaces where rapid system status identification is needed.
   */
  export type ISummary = {
    /** Primary identifier for this system settings record */
    id: string & tags.Format<"uuid">;

    /** Unique technical identifier for configuration value retrieval */
    setting_key: string;

    /**
     * Current configuration value. Can be string/number/json serialized as
     * needed
     */
    setting_value: string;

    /**
     * Data type classification (string, number, boolean, json) for
     * application parsing
     */
    setting_type: string;

    /**
     * Current activation status. Active settings are used by the
     * application
     */
    is_active: boolean;

    /** Deployment environment scope (development, staging, production) */
    environment_scope?: string | undefined;

    /**
     * Human-readable description explaining the setting's purpose and
     * control scope
     */
    description?: string | undefined;
  };

  /**
   * Request parameters for filtering and paginating system configuration
   * settings.
   *
   * This DTO provides flexible query capabilities for system administrators
   * to efficiently locate and manage configuration settings. It supports
   * text-based search across setting keys, values, and descriptions, as well
   * as filtering by status, type, and environment scope.
   *
   * The request parameters are designed to work together for advanced
   * filtering scenarios. For example, administrators can search for specific
   * types of settings while limiting results to particular environments or
   * active/inactive status for efficient system management.
   */
  export type IRequest = {
    /**
     * Page number for pagination. Defaults to 1 if not specified. Used to
     * navigate through large result sets efficiently.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page. Defaults to 10 if not specified, with a
     * maximum of 100 to prevent performance issues.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Search query to filter settings by key, value, or description.
     * Supports partial matching to help locate specific configuration items
     * efficiently.
     */
    search?: string | undefined;

    /**
     * Filter settings by their data type classification. Useful for
     * grouping related configuration items (e.g., show only 'boolean' or
     * 'number' settings).
     */
    setting_type?: string | undefined;

    /**
     * Filter settings by their active status. When true, shows only active
     * settings. When false, shows only inactive settings. When omitted,
     * shows all settings.
     */
    is_active?: boolean | undefined;

    /**
     * Filter settings by deployment environment scope. Useful for viewing
     * settings specific to development, staging, or production
     * environments.
     */
    environment_scope?: string | undefined;
  };
}
