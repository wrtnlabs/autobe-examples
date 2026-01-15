import { tags } from "typia";

export namespace IShoppingMallReviewModeration {
  /**
   * Moderation action details for reviewing a product review, including the
   * action type and optional comment. This schema is used exclusively in
   * administrator-initiated review moderation operations to record decisions
   * on product reviews that violate platform guidelines.
   *
   * This request DTO specifies the mandatory moderation action to be taken on
   * a product review and allows optional contextual commentary from the
   * administrator. When submitted, the system creates an immutable audit log
   * entry in the shopping_mall_review_moderation_logs table that records the
   * administrator's action, timestamp, and any provided comment.
   *
   * All moderation actions are subject to strict authorization controls that
   * restrict usage to administrators only. The system validates that the
   * referenced review exists and is in a modifiable state before processing
   * the request. This interface ensures a standardized, auditable approach to
   * content moderation while allowing administrators appropriate discretion
   * in their decisions.
   *
   * This schema directly maps to the administrative function provided by the
   * endpoint: PATCH /shoppingMall/admin/reviews/{reviewId}/moderate.
   */
  export type IRequest = {
    /**
     * The moderation action to be taken on the review.
     *
     * - "approve": Accept and publish the review. This removes any pending
     *   flag status and makes the review visible to all users.
     * - "reject": Remove the review from public view. The review is hidden
     *   from customers but maintained in the system for audit purposes.
     * - "flag": Mark the review for further review by moderation team. This
     *   preserves the review's visibility while indicating it requires
     *   additional human assessment.
     *
     * The action field is mandatory and must be exactly one of the three
     * permitted values. This enum ensures consistent moderation workflows
     * and prevents ambiguous or unsupported actions.
     *
     * These action types correspond directly to the moderation workflow
     * defined in business requirements and are constrained to these three
     * specific values to maintain audit trail integrity and prevent
     * misuse.
     */
    action: "approve" | "reject" | "flag";

    /**
     * An optional comment provided by the administrator explaining the
     * moderation decision.
     *
     * This field allows administrators to document their reasoning for a
     * moderation action, which can be used for training purposes, internal
     * reference, or customer communication (if appropriate). The comment is
     * stored in the moderation log but is not displayed to customers.
     *
     * Length is limited to 500 characters to ensure comments remain concise
     * and focused while providing sufficient context for administrators to
     * justify their decisions. Comments should be professional, objective,
     * and reference specific policy violations when applicable.
     *
     * This field is optional and can be omitted if no additional
     * explanation is needed.
     */
    comment?: (string & tags.MaxLength<500>) | undefined;
  };
}
