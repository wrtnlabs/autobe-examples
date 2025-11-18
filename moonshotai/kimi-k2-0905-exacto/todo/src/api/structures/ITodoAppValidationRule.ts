import { tags } from "typia";

export namespace ITodoAppValidationRule {
  /**
   * A summary representation of a validation rule used for administrative
   * interfaces and system configuration displays.
   *
   * This summary DTO provides essential identification and status information
   * about validation rules without exposing the detailed constraint
   * definitions or implementation specifics. It offers sufficient information
   * for administrative dashboards, rule management interfaces, and system
   * configuration displays where complete rule details are not immediately
   * necessary.
   *
   * The design emphasizes read-only administrative functionality, presenting
   * rule identification, application scope, and operational status while
   * maintaining privacy of internal validation logic through controlled data
   * exposure appropriate for summary usage scenarios. Rules help ensure data
   * integrity and consistent validation across the todo application.
   */
  export type ISummary = {
    /**
     * Primary key identifier for this validation rule record, providing
     * stable reference for administrative operations, rule management
     * workflows, and system configuration updates
     */
    id: string & tags.Format<"uuid">;

    /**
     * Human-readable name for this validation rule. Displayed in
     * administrative interfaces for rule identification and used in
     * user-facing error messages. Provides clear label distinguishing this
     * rule from others in rule management workflows.
     */
    rule_name: string;

    /**
     * Technical identifier reference used by application logic to invoke
     * this specific validation rule programmatically. Enables code-based
     * rule application and error handling within the todo application's
     * validation framework.
     */
    rule_key: string;

    /**
     * Type classification of validation defining how this rule is applied
     * and evaluated by the system. Categorizations include length limits,
     * format requirements, range constraints, and custom business logic
     * validations that determine application behavior.
     */
    validation_type: string;

    /**
     * Target field or data type this rule validates, expressed using dot
     * notation (e.g., task.title, user.email) to precisely identify the
     * application scope and enable accurate rule application during data
     * validation workflows.
     */
    field_target?: string | undefined;

    /**
     * Template for error messages generated when validation fails,
     * supporting placeholders for field names and constraint values. Used
     * for consistent user notification and helps developers understand rule
     * applications and failure scenarios.
     */
    error_message_template?: string | undefined;

    /**
     * Execution priority order between different rules that might apply to
     * the same field. Lower numbers execute first, enabling rule ordering
     * for complex validation scenarios where rule precedence affects
     * validation outcomes and user experience.
     */
    priority?: (number & tags.Type<"int32">) | undefined;

    /**
     * Boolean status indicating whether this validation rule is currently
     * enforced during data validation operations. Supports administrative
     * rule management through enabled/disabled toggles for maintenance,
     * testing, and gradual rollout scenarios.
     */
    is_active: boolean;

    /**
     * Timestamp when this validation rule was created. Tracks when rules
     * were introduced into the system.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
