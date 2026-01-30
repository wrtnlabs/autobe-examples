import { tags } from "typia";

export namespace ICommunityBbsCommunityApprovalRequest {
  /**
   * Summary view of pending community creation approval requests for
   * administrator review. Contains only essential fields to minimize data
   * transfer and improve response time for large datasets.
   */
  export type ISummary = {
    /**
     * Unique identifier for the approval request.
     *
     * @x-autobe-specification Direct mapping from community_bbs_community_approval_requests.id column.
     */
    request_id: string & tags.Format<"uuid">;

    /**
     * The user ID of the member who submitted the community creation
     * request.
     *
     * @x-autobe-specification Direct mapping from community_bbs_community_approval_requests.submitter_id column.
     */
    submitter_id: string & tags.Format<"uuid">;

    /**
     * The name of the community requested for creation.
     *
     * @x-autobe-specification Direct mapping from community_bbs_community_approval_requests.community_name column.
     */
    community_name: string;

    /**
     * Timestamp when the community creation request was submitted.
     *
     * @x-autobe-specification Direct mapping from community_bbs_community_approval_requests.submitted_at column.
     */
    submitted_at: string & tags.Format<"date-time">;
  };
}
