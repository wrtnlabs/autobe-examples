import { tags } from "typia";

export namespace IRedditLikeDashboardSubscriptionStat {
  /**
   * Aggregated subscription statistics for the member's dashboard showing community participation summary.
   */
  export type ISummary = {
    /**
     * Total number of subscriptions across all communities.
     *
     * @x-autobe-specification COUNT(*) of all subscriptions in the subscriptions table.
     */
    total_subscriptions: number & tags.Type<"int32">;

    /**
     * Number of subscriptions with active status for the current user.
     *
     * @x-autobe-specification COUNT WHERE status='subscribed' from the subscriptions table.
     */
    subscribed_count: number & tags.Type<"int32">;
  };
}
