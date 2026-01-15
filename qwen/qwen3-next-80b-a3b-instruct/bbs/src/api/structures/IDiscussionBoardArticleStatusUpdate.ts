import { tags } from "typia";

export namespace IDiscussionBoardArticleStatusUpdate {
  /**
   * Request payload for bulk status update of discussion board articles.
   *
   * Contains the list of article identifiers and the target status to apply
   * to each article in the batch operation. This schema defines the structure
   * for the request body of the PATCH
   * /discussionBoard/moderator/actions/articles/bulk-status endpoint.
   *
   * Business Purpose: Enables efficient moderation workflows where groups of
   * articles require synchronized status changes. This could include
   * bulk-publishing approved content, hiding spam across multiple posts, or
   * archiving large volumes of policy-violating discussion threads.
   *
   * Security: Access is restricted to moderator and admin roles. The system
   * verifies actor permissions before processing and validates each article
   * ID against the discussion_board_articles table.
   *
   * Atomic Operation: The update is atomic - if any article ID is invalid,
   * doesn't exist, or the target status is not permitted for any article in
   * the batch, the entire operation fails and no articles are modified. This
   * ensures data integrity across the batch.
   *
   * Data Flow: The system executes multiple individual status updates within
   * a single database transaction. Each successful status change creates a
   * corresponding record in the discussion_board_article_status_logs table
   * with the moderator's details and provided reason (if included).
   *
   * Validation Rules:
   *
   * - Article_ids array must contain at least one valid UUID
   * - Target_status must be a valid value defined in
   *   discussion_board_article_statuses
   * - Target_status must differ from the current status of each target article
   * - Reason, if provided, must not exceed 500 characters
   * - All article IDs must correspond to existing records in
   *   discussion_board_articles
   *
   * Related Schema: IDiscussionBoardArticleStatusUpdate.IResponse for the
   * corresponding response structure that reports successes and failures.
   */
  export type IRequest = {
    /**
     * Array of unique article identifiers to update.
     *
     * Each ID represents a specific article in the
     * discussion_board_articles table that requires a status change. All
     * provided article IDs must exist in the database, otherwise the entire
     * batch operation fails with validation errors. If any article ID is
     * invalid or corresponds to a non-existent record, the operation is
     * rejected entirely.
     *
     * This array is used to identify the exact set of articles that will be
     * subject to the status transition. Each UUID must match a primary key
     * in the discussion_board_articles table. The system performs
     * validation against the actual database records before processing the
     * update.
     *
     * Usage Context: Used in moderation workflows where multiple articles
     * need status transitions (publish, hide, archive) in a single atomic
     * operation. This design enables efficient bulk management of content
     * without requiring individual requests for each article.
     */
    article_ids: (string & tags.Format<"uuid">)[] & tags.MinItems<1>;

    /**
     * The new publication status to apply to all specified articles.
     *
     * Determines the final publication state of articles in the batch
     * operation. Valid values are 'published', 'hidden', 'archived', or
     * 'pending' - each corresponding to a defined state in the
     * discussion_board_article_statuses lookup table.
     *
     * This field represents a transition from the article's current status
     * to a new state, triggering workflow actions such as visibility
     * changes, archival processes, or moderation reviews. The system
     * ensures the requested status is valid and different from the
     * article's current status to prevent redundant operations.
     *
     * Each status value has distinct business implications: 'published'
     * makes content visible, 'hidden' temporarily conceals it, 'archived'
     * permanently removes it from view while preserving data for
     * compliance, and 'pending' places it in moderation queue.
     *
     * Security and Compliance: This transition is restricted to moderator
     * and admin roles. All status changes are recorded in the
     * discussion_board_article_status_logs table as immutable audit trails,
     * including the requesting actor, timestamp, and optional reason.
     */
    target_status: "published" | "hidden" | "archived" | "pending";

    /**
     * Optional reason for the status change, providing audit trail context.
     *
     * This field records the moderator's justification for the bulk action,
     * aiding in compliance reporting, appeal resolution, and internal
     * review. The reason should be concise but sufficiently detailed to
     * explain the moderation decision, such as references to violated
     * community guidelines, spam patterns, or quality concerns.
     *
     * Format: Text with maximum length of 500 characters. Data is stored in
     * the discussion_board_article_status_logs table alongside each status
     * transition, creating a complete audit trail for accountability and
     * compliance purposes.
     *
     * Note: While not required in the schema, providing a reason is
     * strongly encouraged for all moderation actions to ensure transparency
     * and legal defensibility of platform decisions.
     */
    reason?: (string & tags.MaxLength<500>) | undefined;
  };

  /**
   * Response containing the count of successfully updated articles and any
   * validation errors for articles that failed to update.
   *
   * This structure provides a comprehensive summary of the bulk article
   * status update operation, distinguishing between successful updates and
   * validation failures. The success count reflects the number of articles
   * whose status was successfully modified according to the requested target
   * status. The errors array details specific issues encountered during
   * validation for each article that could not be updated.
   *
   * The response is designed for high-volume moderation workflows, enabling
   * clients to understand both overall success and specific failure reasons.
   * This pattern supports batch processing efficiency while maintaining clear
   * feedback for troubleshooting, audit logging, and user notification
   * systems.
   *
   * Used in the bulk update operation (PATCH
   * /discussionBoard/moderator/actions/articles/bulk-status) for moderator
   * and admin workflow.
   */
  export type IResponse = {
    /**
     * Number of articles successfully updated with the target status.
     *
     * This count represents how many articles were processed and had their
     * status changed successfully according to the requested target status.
     * Each increment corresponds to an article that passed all validation
     * checks and had its status transitioned in the database. This field
     * reflects the primary outcome metric for the bulk operation, enabling
     * clients to gauge the effectiveness of the update action.
     *
     * This value is derived from the actual database updates performed and
     * is guaranteed to match the number of successful transaction commits
     * in the underlying discussion_board_articles table. It excludes any
     * articles that failed validation or encountered processing errors.
     *
     * Corresponds to the atomic nature of the bulk update operation: either
     * all valid updates succeed or none are applied. This field provides
     * immediate feedback on the batch's success rate without requiring
     * separate queries.
     */
    successCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * List of validation errors for articles that could not be updated.
     *
     * This array contains one entry for each article in the request batch
     * that failed validation and could not be processed. Each object
     * includes the article identifier, a machine-readable reason code, and
     * a human-readable message explaining the failure.
     *
     * The errors array is empty when all requested updates were successful.
     * When present, it enables the client to identify exactly which
     * articles were rejected and why, without obscuring potentially
     * successful updates. This partial success/error model is essential for
     * large-scale moderation operations where hundreds or thousands of
     * articles may be processed in a single batch.
     *
     * Each error object must correspond to an article ID provided in the
     * original request, ensuring traceability from response back to request
     * inputs. Keys to understand why a failed article update occurred,
     * especially in the context of moderation and content management
     * workflows.
     */
    errors: IDiscussionBoardArticleStatusUpdate.IErrorResponse[];
  };

  /**
   * Error information for a single article that failed to update during a
   * bulk status update operation.
   *
   * This schema defines the structure of individual error objects that are
   * returned in the errors array of
   * IDiscussionBoardArticleStatusUpdate.IResponse. Each error object
   * represents one article in the batch that could not be processed due to
   * validation or processing failure.
   *
   * The failure may occur for several reasons: the article ID may be invalid
   * or nonexistent, the target status may not be a permitted transition from
   * the current status, or the requesting actor may lack sufficient
   * privileges. The response for each failed article includes sufficient
   * information for the client to identify the cause and potentially retry
   * the operation with corrected data.
   *
   * This error structure follows the industry-standard convention for batch
   * operation responses, distinguishing between overall success
   * (successCount) and specific failures (errors). This pattern enables
   * partial success semantics - if some articles update successfully while
   * others fail, the client still receives a successful response with
   * detailed failure information.
   *
   * Structure: Consists of three fields:
   *
   * - Article_id: The specific article that failed (UUID)
   * - Code: Machine-readable error type
   * - Message: Human-readable explanation
   *
   * Use Case: When moderation teams process hundreds of articles for status
   * changes, this error format allows them to quickly identify and address
   * the specific articles that encountered problems without obscuring the
   * successful updates.
   *
   * System Rules:
   *
   * - Only returned for articles that failed to update during processing
   * - Always returned as part of the errors array in the response
   * - Never included in successful response entries
   * - Must be provided for every article that fails processing
   *
   * Relation: This error type is consumed by the
   * IDiscussionBoardArticleStatusUpdate.IResponse schema and is associated
   * with the discussion_board_articles table through article_id.
   */
  export type IErrorResponse = {
    /**
     * Unique identifier of the article that failed to update.
     *
     * This UUID corresponds to a specific article in the
     * discussion_board_articles table that could not be processed during
     * the bulk status update operation. This allows clients to trace
     * exactly which article encountered validation or processing errors.
     *
     * The article_id is included in the error response to provide direct
     * context for troubleshooting. It matches the article_id provided in
     * the request body, enabling clients to correlate failure reports with
     * their original input.
     *
     * Usage Context: Critical for moderation workflows where hundreds or
     * thousands of articles are processed in a single batch. Without this
     * field, clients would be unable to identify which specific article
     * failed.
     *
     * Format: Must be a valid UUID string (as defined in RFC 4122). The
     * system validates that this ID corresponds to an existing article in
     * the database before attempting processing.
     */
    article_id: string & tags.Format<"uuid">;

    /**
     * Machine-readable error code indicating the specific validation
     * failure.
     *
     * This standardized code allows automated systems to programmatically
     * handle errors without relying on human-readable messages that may
     * change. Each code corresponds to a specific business validation rule
     * that was violated.
     *
     * Known values:
     *
     * - "ARTICLE_NOT_FOUND": The article_id does not correspond to any
     *   existing article in the database
     * - "INVALID_STATUS_TRANSITION": The requested target_status is not
     *   permitted from the article's current status
     * - "DUPLICATE_STATUS": The requested status is identical to the
     *   article's current status
     * - "NOT_MODERATOR": The actor lacks sufficient privileges to perform
     *   this status update
     * - "ARTICLE_ARCHIVED": The article is already archived and cannot be
     *   modified
     *
     * Business Rule: A successful status update cannot leave the article in
     * a status that already exists. This code helps identify redundant
     * operations. This code may also identify attempts to delete or modify
     * archived, deleted, or highly restricted content.
     *
     * Security: This code is logged server-side and exposed to clients only
     * for debugging and operational transparency. It does not reveal system
     * architecture details or internal system state.
     *
     * Implementation: This code is directly mapped from validation rules in
     * the moderation service layer.
     */
    code: string;

    /**
     * Human-readable description of the error condition.
     *
     * This field provides a clear explanation of why the status update
     * failed for the specific article. It should be understandable to
     * frontend developers and moderation interface users, not technical
     * system administrators.
     *
     * Format: Plain text with a maximum length of 255 characters. This
     * message is displayed to users in moderation dashboards and reporting
     * interfaces to assist with troubleshooting.
     *
     * Purpose: Accompanies the machine-readable code to provide context
     * that helps users understand and take corrective actions. While the
     * code is used by automated systems, this message helps human reviewers
     * and moderators respond appropriately.
     *
     * Security: This message is sanitized for user display and does not
     * expose internal system details that could be exploited.
     */
    message: string & tags.MaxLength<255>;
  };
}
