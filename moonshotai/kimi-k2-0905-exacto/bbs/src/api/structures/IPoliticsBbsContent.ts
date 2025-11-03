import { tags } from "typia";

import { IPoliticsBbsArticle } from "./IPoliticsBbsArticle";
import { IPoliticsBbsComment } from "./IPoliticsBbsComment";

export namespace IPoliticsBbsContent {
  /**
   * Request structure for rejecting content that violates community
   * guidelines or platform policies. This DTO enables moderators to provide
   * specific, constructive feedback to content creators while maintaining
   * transparency in the moderation process. The structure supports
   * educational moderation by explaining violations and referencing
   * applicable policies, helping users understand how to create compliant
   * content in the future.
   */
  export type IReject = {
    /**
     * Detailed explanation of why the content is being rejected. This helps
     * content creators understand policy violations and improve future
     * submissions. The reason should be specific, constructive, and
     * reference relevant community guidelines or platform policies that
     * were violated.
     */
    reason: string & tags.MinLength<10> & tags.MaxLength<1000>;

    /**
     * Reference to the specific policy or community guideline that was
     * violated. This could be 'content-focus-policy',
     * 'personal-attack-policy', 'spam-policy', or other documented platform
     * policies. Helps maintain transparency in moderation decisions and
     * provides educational value to users.
     */
    referencePolicy: string & tags.MinLength<5> & tags.MaxLength<50>;

    /**
     * Classification of the violation severity for quota tracking and
     * potential escalation. Values include 'minor', 'moderate', or 'severe'
     * based on the nature and impact of the policy violation.
     */
    severityLevel: "minor" | "moderate" | "severe";

    /**
     * Whether to send a notification to the content creator about the
     * rejection. When true, the system will send an in-site message
     * explaining the rejection and providing guidance for improvement.
     * Helps maintain positive community relationships while enforcing
     * standards.
     */
    notifyCreator: boolean;
  };

  /**
   * Response confirming successful content rejection with complete moderation
   * details. This response provides transparency in the moderation process by
   * confirming the state change, notifying the content creator, and
   * maintaining audit trails. The response includes all rejection details for
   * record-keeping and helps moderators track their actions across the
   * platform.
   */
  export type IRejectResponse = {
    /**
     * ISO 8601 timestamp indicating when the rejection was processed. Used
     * for audit trails and tracking moderation response times.
     */
    processedAt: string & tags.Format<"date-time">;

    /**
     * The unique identifier of the content that was rejected. This confirms
     * which specific article or comment was processed by the moderation
     * system.
     */
    contentId: string & tags.Format<"uuid">;

    /**
     * Polymorphic content type that returns either an article or comment
     * summary depending on what type of content was rejected. This union
     * type enables the moderation system to handle both article and comment
     * rejections through a unified response structure while maintaining
     * type safety and providing appropriate content context for the
     * rejection operation.
     */
    contentType?:
      | IPoliticsBbsArticle.ISummary
      | IPoliticsBbsComment.ISummary
      | undefined;

    /**
     * Whether the content creator was successfully notified about the
     * rejection. True means an in-site message was sent with the rejection
     * reason and policy reference.
     */
    creatorNotified: boolean;

    /**
     * The unique identifier of the moderator who performed the rejection.
     * This maintains audit trail accountability for all moderation
     * actions.
     */
    moderatorId: string & tags.Format<"uuid">;

    /**
     * The updated status of the content after rejection. This is always
     * 'rejected' for this operation, confirming the successful state
     * change.
     */
    newStatus: "rejected";

    /**
     * The status of the content before rejection. This could be 'pending',
     * 'approved', or 'flagged' depending on the content's current state in
     * the moderation workflow.
     */
    previousStatus: "pending" | "approved" | "flagged" | "draft";

    /**
     * Complete details about the rejection including the reason, policy
     * reference, and severity level. This object contains all the
     * information provided in the rejection request for audit trail
     * purposes.
     */
    rejectionDetails: IPoliticsBbsContent.IReject;
  };
}
