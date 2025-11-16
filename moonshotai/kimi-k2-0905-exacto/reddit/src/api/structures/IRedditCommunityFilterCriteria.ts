import { tags } from "typia";

import { IRedditCommunityFilterOperatorOption } from "./IRedditCommunityFilterOperatorOption";
import { IRedditCommunityFilterParameterRequirement } from "./IRedditCommunityFilterParameterRequirement";
import { IRedditCommunityCommunityCategoryConfiguration } from "./IRedditCommunityCommunityCategoryConfiguration";

export namespace IRedditCommunityFilterCriteria {
  /**
   * Summarized configuration definition for Reddit community filtering
   * criteria used in search, analytics, and administrative interfaces. This
   * lightweight representation provides essential filter information
   * including type, validation rules, and available operators without
   * exposing the full configuration complexity. It serves as a quick
   * reference for developers and administrators managing filtering
   * capabilities across different platform components including content
   * discovery, administrative dashboards, and analytical reporting
   * interfaces. The summary includes operational metadata like priority and
   * active status for interface optimization while maintaining comprehensive
   * filtering configuration details.
   */
  export type ISummary = {
    /** Unique identifier for the filter criteria configuration */
    id: string & tags.Format<"uuid">;

    /** Human-readable name identifying this filter definition */
    name: string;

    /** Database column or property name being filtered */
    field_name: string;

    /**
     * Type of filter operation - supported values: text, date, numeric,
     * boolean, enum, relation
     */
    filter_type: string;

    /** Detailed explanation of what this filter does and its use case */
    description: string;

    /**
     * JSON string defining validation constraints, acceptable values, and
     * format requirements
     */
    validation_rules: string;

    /** Available comparison operators for this filter type */
    operator_options: IRedditCommunityFilterOperatorOption[];

    /**
     * List of required parameters that must be provided for this filter to
     * function
     */
    required_parameters: IRedditCommunityFilterParameterRequirement[];

    /** Filter configuration active status for administrative control */
    is_active: boolean;

    /**
     * Default filter value used when no specific value is provided (type
     * varies by filter_type)
     */
    default_value?: string | number | boolean | null | undefined;

    /** Functional grouping category for organizing related filters */
    category: IRedditCommunityCommunityCategoryConfiguration;

    /**
     * Display priority for filter ordering in user interfaces (lower
     * numbers appear first)
     */
    priority: number & tags.Type<"int32">;

    /** Last configuration update timestamp */
    updated_at: string & tags.Format<"date-time">;

    /** Filter configuration creation timestamp */
    created_at: string & tags.Format<"date-time">;
  };
}
