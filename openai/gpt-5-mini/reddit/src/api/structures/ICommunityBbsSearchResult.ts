import { ICommunityBbsPost } from "./ICommunityBbsPost";
import { ICommunityBbsCommunity } from "./ICommunityBbsCommunity";
import { ICommunityBbsComment } from "./ICommunityBbsComment";
import { ICommunityBbsCommunityMember } from "./ICommunityBbsCommunityMember";

export namespace ICommunityBbsSearchResult {
  /**
   * Generic search result summary object used by search APIs. The
   * `target_type` indicates which of the summary schemas is present in
   * `item`. `item` uses oneOf to reference the appropriate .ISummary schema
   * for posts, communities, comments or users.
   */
  export type ISummary = {
    /**
     * Type of the search result target. Allowed values: 'post',
     * 'community', 'comment', 'user'.
     */
    target_type: "post" | "community" | "comment" | "user";

    /** Search engine relevance score (higher means more relevant). */
    relevance_score: number;

    /**
     * The referenced summary object for the search hit. The concrete schema
     * depends on target_type.
     */
    item:
      | ICommunityBbsPost.ISummary
      | ICommunityBbsCommunity.ISummary
      | ICommunityBbsComment.ISummary
      | ICommunityBbsCommunityMember.ISummary;

    /**
     * Optional highlighted snippet extracted from the target for display in
     * search results.
     */
    snippet?: string | undefined;
  };
}
