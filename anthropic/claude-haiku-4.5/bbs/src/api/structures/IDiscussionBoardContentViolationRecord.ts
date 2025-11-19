import { tags } from "typia";

import { IDiscussionBoardContributor } from "./IDiscussionBoardContributor";
import { IDiscussionBoardModerator } from "./IDiscussionBoardModerator";

export namespace IDiscussionBoardContentViolationRecord {
  /**
   * Search and filtering parameters for content policy violation records.
   *
   * This request DTO enables moderators to query violation records with
   * powerful filtering capabilities across violation type, contributor,
   * severity level, enforcement action, moderator, and date range. Used in
   * paginated list operations that return violation history for pattern
   * analysis, moderator performance review, and escalation decisions.
   *
   * The violation records table maintains an immutable audit trail of all
   * policy breaches detected in articles and comments. Moderators use filters
   * to identify violation patterns (repeated offenses of specific types),
   * review individual contributor violation history (complete enforcement
   * context), focus on severe violations (priority review), verify
   * enforcement consistency (by action type or moderator), analyze violations
   * within time windows (trend analysis), and track moderator performance
   * (who documented violations).
   *
   * All filter fields are optional and combine additively to narrow results.
   * Pagination parameters control result set size and position. Sorting
   * options enable different analytical perspectives on violation
   * data—temporal analysis (most recent first), severity-focused review (most
   * severe first).
   */
  export type IRequest = {
    /**
     * Page number for pagination (1-indexed). Defaults to 1 if not
     * specified. Combined with limit to retrieve specific result set
     * windows for large violation datasets.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of violation records per page. Defaults to 20 if not
     * specified. Maximum 100 records per page. Controls result set size for
     * pagination.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter by specific violation type. Optional. When specified, returns
     * only violations of this classification. Enables pattern analysis for
     * specific violation categories (e.g., identifying repeated
     * misinformation violations from specific contributors).
     */
    violation_type?:
      | "hate_speech"
      | "personal_attack"
      | "misinformation"
      | "harassment"
      | "spam"
      | "off_topic"
      | "graphic_content"
      | "threats"
      | "copyright"
      | "other"
      | undefined;

    /**
     * Filter by contributor ID to review complete violation history for a
     * specific user. Optional. When specified, returns all violations
     * recorded against this contributor, enabling assessment of individual
     * behavior patterns, violation frequency, escalation trajectory, and
     * enforcement history context for suspension/restriction decisions.
     */
    contributor_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by moderator ID to review violations documented by a specific
     * moderator. Optional. When specified, returns all violation records
     * created by this moderator, enabling moderation team performance
     * analysis, consistency review, and quality assessment of violation
     * documentation practices.
     */
    moderator_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by violation severity level. Optional. When specified, returns
     * only violations classified at this severity. Enables focus on serious
     * violations for priority moderation review and escalation assessment.
     */
    severity_level?: "minor" | "moderate" | "severe" | undefined;

    /**
     * Filter by enforcement action taken in response to violation.
     * Optional. When specified, returns only violations where this specific
     * action was taken. Enables verification of enforcement consistency
     * across similar violations and review of action pattern
     * appropriateness.
     */
    action_taken?:
      | "edited"
      | "removed"
      | "warned"
      | "restricted"
      | "suspended"
      | "reported_to_admin"
      | undefined;

    /**
     * Filter violations detected on or after this ISO 8601 datetime.
     * Optional. When combined with date_to, creates date range filter for
     * temporal analysis of violation trends, seasonal patterns, or incident
     * investigations.
     */
    date_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter violations detected on or before this ISO 8601 datetime.
     * Optional. When combined with date_from, creates date range for
     * reviewing recent violations or historical enforcement patterns.
     */
    date_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Field to sort results by. Defaults to 'detection_date' (most recent
     * first) if not specified. Enables different analytical perspectives on
     * violation data.
     */
    order_by?: "detection_date" | "severity_level" | undefined;

    /**
     * Sort direction for the selected order_by field. Defaults to 'desc' if
     * not specified.
     */
    order_direction?: "asc" | "desc" | undefined;
  };

  /**
   * Summary view of a content violation record optimized for list displays
   * and audit logging.
   *
   * Provides essential information about a policy violation including the
   * specific violation type, severity level, action taken, and the violating
   * content description. Includes identification of both the contributing
   * user who created the violating content and the moderator who recorded the
   * violation.
   *
   * Omits optional contextual fields (action_details, content_snapshot) to
   * optimize list view performance while retaining critical enforcement
   * information.
   *
   * Used in moderation dashboards, violation history lists, and compliance
   * audit trails to track enforcement actions and contributor violation
   * patterns.
   */
  export type ISummary = {
    /**
     * Unique identifier for the violation record. Generated automatically
     * as UUID upon record creation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Specific type of policy violation detected in the content. Possible
     * values: 'hate_speech' (targeting protected groups), 'personal_attack'
     * (attacking individuals), 'misinformation' (false claims),
     * 'harassment' (coordinated targeting), 'spam' (promotional content),
     * 'off_topic' (unrelated content), 'graphic_content' (explicit
     * imagery/violence), 'threats' (violence or harm threats), 'copyright'
     * (copyright violations), or 'other' (miscellaneous violations).
     */
    violation_type: string;

    /**
     * Severity classification of the violation determining enforcement
     * response. Classification: 'minor' (small correctable issues),
     * 'moderate' (clear policy violation requiring action), or 'severe'
     * (serious violations like hate speech or threats requiring immediate
     * escalation).
     */
    severity: string;

    /**
     * Detailed description of what was violated and why it violates
     * community policy. Includes specific examples from the content that
     * triggered the violation. Maximum 2000 characters, providing context
     * for understanding the violation determination.
     */
    violation_description: string;

    /**
     * Enforcement action taken by the moderator in response to the
     * violation. Possible actions: 'edited' (moderator corrected the
     * content), 'removed' (content deleted), 'warned' (user warned),
     * 'restricted' (posting restrictions applied), 'suspended' (account
     * suspended), or 'reported_to_admin' (escalated to administrator).
     * Documents the moderation response.
     */
    action_taken: string;

    /**
     * Timestamp when the violation was detected by the moderator or
     * automated system. Records the exact moment of violation discovery.
     */
    detected_at: string & tags.Format<"date-time">;

    /**
     * Summary identification of the contributor who created the violating
     * content. Provides contributor context for understanding violation
     * patterns and contributor history.
     */
    contributor: IDiscussionBoardContributor.ISummary;

    /**
     * Summary identification of the moderator who documented and recorded
     * this violation. Tracks moderation accountability and
     * decision-making.
     */
    moderator: IDiscussionBoardModerator.ISummary;

    /**
     * Timestamp when the violation record was created in the system.
     * Establishes authoritative record of when the violation was officially
     * documented.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
