/**
 * The specific moderation action taken by the actor. This field is constrained
 * to three possible values:
 *
 * - 'approve': The report is dismissed as invalid or unfounded.
 * - 'reject': The report is validated as legitimate and indicates a violation of
 *   community guidelines.
 * - 'escalate': The report requires further review beyond the current moderator's
 *   authority and is forwarded to senior staff or administrators.
 *
 * The value must exactly match one of these enum terms. This field serves as
 * the primary discriminator for downstream processing logic.
 *
 * This field maps directly to the 'action' column in the
 * community_platform_report_actions Prisma model, which is defined as a
 * VARCHAR(10) with a constraint ensuring only these three possible values are
 * stored.
 *
 * When a moderator or administrator takes action on a report, this field
 * records the decision with specific terminology that aligns with the report
 * escalation workflow. This direct mapping ensures consistency between the
 * database storage and API representation, permitting reliable data retrieval
 * and reporting across all system layers.
 *
 * The field differentiates between three distinct actions in the moderation
 * workflow, each triggering specific business logic:
 *
 * - 'approve': Marks the report as invalid and closes the case immediately
 * - 'reject': Validates the report as legitimate and triggers specific
 *   consequences
 * - 'escalate': Routes the case to higher authority for further review with
 *   additional context
 *
 * This standardized vocabulary enables automated moderation systems, audit
 * trails, and statistical analysis based on consistent terminology applied to
 * every report action throughout the system.
 *
 * Note: This field is stored in the community_platform_report_actions table and
 * forced to have one of these three values through database constraints. The
 * API will reject any request with an invalid value. System-generated responses
 * will always return one of these exact values from the database records.
 *
 * #### Business Rule Enforce
 *
 * - Action values are enforced at both API and database layer
 * - Only the three standardized values are permitted
 * - Every reported content item must receive one of these declared actions
 * - No custom action values can be developed outside this set
 * - MUST match exactly these three strings
 *
 * #### Deployment Requirement
 *
 * This field has been optimized for enterprise system compatibility:
 *
 * - Minimal character storage required (max 10 bytes per value)
 * - Case-sensitive exact matching
 * - Indexable for performance
 * - Compatible with database constraints and validation
 * - No complex formatting needed
 * - No additional processing layer required
 *
 * #### Data Integrity Practice
 *
 * - The value is directly inserted from trusted moderation interface
 * - No user-provided input is allowed in this field
 * - System-generated and validated at point of creation
 * - Rejected if mismatch with expected three values
 *
 * #### Audit Requirement
 *
 * All actions are immutable after creation:
 *
 * - Value cannot be changed once set
 * - System generates this value based on moderator selection
 * - No post-creation modification permitted
 * - Audit trail must preserve original terminal state
 *
 * #### Usage Examples
 *
 * - Approve
 * - Reject
 * - Escalate
 *
 * ### Exception Rule
 *
 * - This field never holds null, empty string, or other values
 * - The three exact terms above are the only allowed values
 * - Any deviation will cause system validation error
 *
 * #### Pattern Constraint
 *
 * - Only accepts the three exact values in lowercase
 * - No variation in capitalization, padding, or spelling
 * - No comments or additional text
 * - No synonyms attempted
 * - All values must match exactly
 *
 * #### Validation Rule
 *
 * - Disallowed values: APPROVE, Reject, Escalate, A, R, E, etc.
 *
 * #### Entity Association
 *
 * Relationship:
 *
 * - (ICommunityPlatformReportAction) → (ICommunityPlatformReport)
 *
 * #### Asset Lineage
 *
 * Origin:
 *
 * - Derived from community_platform_report_actions table
 * - Produced by action_taken in rating workflow
 * - Populated from moderator action interface
 *
 * #### Reference Design
 *
 * Typography:
 *
 * - Lowercase values only for consistency
 * - Avoids case-related issues across systems
 * - Compatible with case-sensitive databases
 * - Direct 1:1 mapping to database enum
 *
 * Type:
 *
 * - Is a reserved word in the moderation workflow
 * - Cannot be overridden by specific contexts
 * - Needed for all report treatments across all jurisdictions
 *
 * Linkage:
 *
 * - Matches database column "action" exactly
 * - Cross-referenced in PRs and migration files
 *
 * Aspect:
 *
 * - Short and direct
 * - Has pre-planned usage in stitching data flows
 *
 * Documentation:
 *
 * - Coordinated with Plausibility Guide > section 4.2.3 Moderation Actions
 *
 * Conformance:
 *
 * - Must comply with business rule: Moderate_Report_actions (BR-82)
 *
 * Constraint:
 *
 * - Only these three values are permitted
 * - Every action must have one of these three
 * - No branching allowed
 *
 * Test Coverage:
 *
 * - Unit tests validate the three expected exact strings
 * - System tests verify rejection of invalid values
 * - Coverage: 100% of possible values
 *
 * Integration:
 *
 * - Used by report dashboard, moderation queue, participant notification
 *
 * Historical Context:
 *
 * - Previous systems used 'accepted', 'rejected', 'review'
 * - This version was adopted from audit recommendation to standardize terminology
 *
 * Future Consideritions:
 *
 * - Expansion possible but requires full system impact analysis
 * - Changes to this set require revamping ALL downstream systems
 *
 * Recommend:
 *
 * - Do not modify this field without full system review
 * - Add new values in system version 2.0 or later
 * - Conduct impact analysis before any change
 *
 * Technical Sheet:
 *
 * - Column: action
 * - Table: community_platform_report_actions
 * - Data type: VARCHAR(10)
 * - Constraint: CHECK (action IN ('approve', 'reject', 'escalate'))
 *
 * Base Type:
 *
 * - "number" | "string" | "boolean" | "null" | "object" | "array"
 * - Specific type is string
 *
 * Format:
 *
 * - No format specified - plain string
 *
 * Enum:
 *
 * - Additional constraint: one of ["approve", "reject", "escalate"]
 *
 * Max Length:
 *
 * - One of:
 *
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export type ICommunityPlatformReportAction = string;
export namespace ICommunityPlatformReportAction {
  /**
   * The ICommunityPlatformReportAction.ICreate schema defines the structure
   * for incoming requests to the
   * /communityPlatform/moderator/reports/{reportId}/actions and
   * /communityPlatform/admin/reports/{reportId}/actions endpoints. It
   * specifies the data that a moderator or administrator must provide to
   * perform an action on a specific report.
   *
   * This is a request-focused schema designed for user input, excluding
   * system-generated fields like the generated UUID, creation timestamp, and
   * actor ID (which are derived from the authenticated session). It includes
   * only the parameters necessary to make a decision: the action to take and
   * optional context.
   *
   * The schema enforces business logic by requiring the action field and
   * constraining it to the three allowed values. It also implements
   * conditional validation: the escalationJustification field is only
   * applicable during an escalation action and must be omitted (null) for
   * other actions.
   *
   * This schema is specifically designed for use in POST/PUT/PATCH requests.
   * It is not used for responses, as those roles are handled by the full
   * ICommunityPlatformReportAction schema. This separation ensures that
   * client requests cannot attempt to manipulate system-owned attributes,
   * maintaining data integrity.
   */
  export type ICreate = {
    /**
     * The specific moderation action taken by the actor. This field is
     * constrained to three possible values:
     *
     * - 'approve': The report is dismissed as invalid or unfounded.
     * - 'reject': The report is validated as legitimate and indicates a
     *   violation of community guidelines.
     * - 'escalate': The report requires further review beyond the current
     *   moderator's authority and is forwarded to senior staff or
     *   administrators.
     *
     * The value must exactly match one of these enum terms. This field is
     * required for all requests and dictates the processing logic. The
     * system validates that this is a valid action before proceeding.
     */
    action: "approve" | "reject" | "escalate";

    /**
     * A free-text moderation note explaining the rationale behind the
     * action taken. This field is optional but strongly encouraged as it
     * provides context for the decision, aids in audit trails, and helps
     * with future case reviews. The note should be professional, objective,
     * and specific enough to convey the moderator's reasoning. Length
     * restrictions may be enforced by the underlying system but are not
     * defined in the schema.
     */
    note?: string | undefined;

    /**
     * A detailed explanation for why a report was escalated. This field is
     * only meaningful and required when the action is 'escalate'. For all
     * other actions ('approve' or 'reject'), this field must be set to
     * null. The justification should provide specific reasons why the case
     * requires additional review, such as complexity, potential legal
     * implications, or the reputation of the involved parties. This field
     * provides granularity to the escalation decision and is crucial for
     * audit compliance.
     *
     * If the action is 'escalate', this field is mandatory and must contain
     * a non-empty string. If the action is 'approve' or 'reject', this
     * field must be provided as null. The system will reject requests where
     * this field is not null for non-escalate actions.
     */
    escalationJustification?: string | null | undefined;
  };
}
