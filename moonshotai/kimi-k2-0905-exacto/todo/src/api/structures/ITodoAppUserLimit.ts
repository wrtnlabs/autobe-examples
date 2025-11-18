import { tags } from "typia";

import { ITodoAppUser } from "./ITodoAppUser";
import { ITodoAppValidationRule } from "./ITodoAppValidationRule";
import { IPaginationBase } from "./IPaginationBase";

export namespace ITodoAppUserLimit {
  /**
   * Lightweight representation of user limit information for efficient
   * display in user interfaces, quota monitoring tools, and administrative
   * dashboards.
   *
   * This summary DTO provides essential limit status information suitable for
   * user notifications, usage tracking displays, and quota management
   * interfaces. It transforms foreign key relationships from the database
   * schema into complete object references, enabling administrators to see
   * full user account information and validation rule definitions without
   * additional API calls.
   *
   * The relations are transformed to use .ISummary types for all contextual
   * references, preventing potential circular reference issues while
   * providing sufficient information for administrative decision-making. This
   * design supports efficient list displays while maintaining the
   * relationship context needed for effective quota and limit management
   * operations.
   */
  export type ISummary = {
    /**
     * Unique identifier for the user limit entry in the system, providing
     * stable reference for administrative operations and quota tracking
     */
    id: string & tags.Format<"uuid">;

    /**
     * Complete user account information this limit applies to, providing
     * full context including email address and creation date for
     * administrative reference. Transformed from the user_id foreign key to
     * enable immediate understanding of which user account is affected by
     * this limit without requiring separate user data lookups.
     */
    user?: ITodoAppUser.ISummary | undefined;

    /**
     * Complete validation rule context defining what operation or data
     * field this limit controls, supporting administrative monitoring and
     * quota management interfaces. Transformed from constraint_rule_id
     * foreign key to provide rule details immediately including rule key,
     * validation type, and field target for comprehensive administrative
     * understanding.
     */
    constraintRule?: ITodoAppValidationRule.ISummary | undefined;

    /**
     * Current numerical limit value representing the maximum allowance for
     * the targeted operation or resource, displayed in administrative
     * interfaces for quota monitoring and user communication about system
     * constraints
     */
    limit_value: number & tags.Type<"int32">;

    /**
     * Type of limit being enforced (e.g., 'task_count', 'category_count',
     * 'bulk_operation_size', 'api_rate'). Defines what resource is being
     * limited.
     */
    limit_type: string;

    /**
     * Time period for which this limit applies (e.g., 'lifetime', 'daily',
     * 'weekly', 'monthly'). Determines how limits reset or accumulate.
     */
    period_type: string;

    /**
     * Human-readable description providing clear explanation of what this
     * limit controls, its purpose in the system, and practical implications
     * for users.
     */
    description: string;

    /**
     * Boolean status indicating whether this user limit is currently being
     * enforced by the application, supporting administrative toggling of
     * limits for maintenance, testing, or policy adjustments without data
     * deletion
     */
    is_active: boolean;

    /**
     * Timestamp when this user limit was created or customized for this
     * user. Tracks when limits were established.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this user limit was last modified. Tracks changes to
     * user-specific limits over time.
     */
    updated_at: string & tags.Format<"date-time">;
  };

  /**
   * Extended pagination request for user limit queries with entity-specific
   * filtering.
   *
   * Builds upon the base pagination structure to add user limit-specific
   * filters including limit type, period type, and activation status. This
   * enables sophisticated querying of user quotas and constraints while
   * maintaining consistent pagination patterns across the application.
   */
  export type IRequest = {
    /**
     * Base pagination and search controls including page number, limit, and
     * optional text search.
     */
    pagination: IPaginationBase.ICreate;

    /**
     * Filter to show only specific types of limits (e.g., 'task_count',
     * 'category_count', 'bulk_operation_size'). Use to narrow results to
     * relevant limit categories.
     */
    limitType?: string | null | undefined;

    /**
     * Filter by time period scope (e.g., 'lifetime', 'daily', 'weekly',
     * 'monthly'). Used to limit results to specific time-based quota
     * categories.
     */
    periodType?: string | null | undefined;

    /**
     * Filter by activation status of user limits. True for active limits
     * only, false for inactive, null for all.
     */
    isActive?: boolean | null | undefined;
  };
}
