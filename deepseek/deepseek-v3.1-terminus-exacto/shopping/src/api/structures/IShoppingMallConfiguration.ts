import { tags } from "typia";

export namespace IShoppingMallConfiguration {
  /**
   * Summary view of shopping mall configuration settings optimized for list
   * displays and quick reference.
   *
   * This summary representation provides essential configuration information
   * for administrative interfaces and configuration management dashboards. It
   * includes key fields needed for identifying and managing platform settings
   * while excluding sensitive data and detailed configuration values. The
   * summary focuses on configuration metadata such as key, scope,
   * environment, and status indicators, allowing administrators to quickly
   * browse and locate specific settings without loading the full
   * configuration details.
   *
   * This lightweight format supports efficient pagination and search
   * operations across large configuration sets. Proper summary design ensures
   * that configuration management interfaces remain responsive while
   * providing sufficient context for administrative decision-making and
   * operational oversight. Configuration summaries are used in list views,
   * search results, and dashboard displays where comprehensive configuration
   * details are not immediately required.
   *
   * The summary maintains a balance between information density and
   * performance, including critical identification fields while omitting
   * potentially large configuration values that are better suited for
   * detailed views. This approach supports scalable configuration management
   * across diverse platform environments and deployment scenarios.
   */
  export type ISummary = {
    /**
     * Unique identifier of the configuration setting. Used for referencing
     * specific configurations in management operations and providing stable
     * identification across configuration lifecycle changes.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique configuration key that identifies the setting. Follows dot
     * notation for hierarchical organization (e.g.,
     * 'payment.gateway.timeout'). Essential for configuration
     * identification, lookup operations, and hierarchical navigation within
     * configuration management systems.
     */
    config_key: string;

    /**
     * Data type of the configuration value. Valid values: string, number,
     * boolean, json, array, object. Guides value parsing, validation, and
     * appropriate UI rendering in administrative interfaces and
     * configuration management tools.
     */
    data_type: string;

    /**
     * Configuration scope defining where the setting applies. Values:
     * global, channel, section, environment. Enables targeted configuration
     * management, scope-based filtering, and hierarchical configuration
     * resolution where more specific settings override general defaults.
     */
    scope: string;

    /**
     * Target environment for this configuration. Values: development,
     * staging, production, all. Supports environment-specific configuration
     * management, deployment control, and environment-aware configuration
     * resolution for multi-environment platform deployments.
     */
    environment: string;

    /**
     * Indicates whether the configuration value should be encrypted at
     * rest. Used for identifying sensitive settings that require special
     * handling, security protocols, and enhanced access controls to protect
     * credentials, API keys, and other confidential configuration data.
     */
    is_encrypted: boolean;

    /**
     * Configuration version number for tracking changes and supporting
     * rollback capabilities. Auto-incremented on updates to maintain
     * configuration history and enable version-aware configuration
     * management with change tracking and audit capabilities.
     */
    version: number & tags.Type<"int32">;

    /**
     * Detailed description of the configuration setting's purpose, usage,
     * and acceptable values. Essential for administrative management,
     * providing context for configuration decisions, and supporting
     * configuration documentation and knowledge transfer.
     */
    description: string;

    /**
     * Timestamp when the configuration was initially created. Used for
     * chronological sorting, audit trail reference, and configuration
     * lifecycle tracking in configuration management interfaces and
     * administrative dashboards.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the configuration was last modified. Tracks
     * configuration changes for version control, audit purposes, and
     * providing visibility into configuration modification history for
     * administrative oversight and compliance requirements.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the configuration was soft-deleted. Allows safe
     * removal while maintaining historical references, supporting
     * configuration lifecycle management, and enabling recovery
     * capabilities for accidentally deleted configurations.
     */
    deleted_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
