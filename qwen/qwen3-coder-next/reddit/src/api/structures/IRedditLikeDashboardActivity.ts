import { tags } from "typia";

import { IRedditLikeCommunity } from "./IRedditLikeCommunity";
import { IRedditLikeMember } from "./IRedditLikeMember";

export namespace IRedditLikeDashboardActivity {
  /**
   * Summary of a recent user activity item (post or comment) for dashboard display.
   */
  export type ISummary = {
    /**
     * Unique identifier for the activity item (post or comment).
     *
     * @x-autobe-specification Aggregated from reddit_like_posts.id or reddit_like_comments.id depending on activity type. Computed identifier for activity summary.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type discriminator value identifying this as an activity summary.
     *
     * @x-autobe-specification Hardcoded constant 'activity' for IRedditLikeDashboardActivity.ISummary discriminator.
     */
    type: "activity";

    /**
     * Source type indicating whether activity is from a post or comment.
     *
     * @x-autobe-specification Computed from source: 'post' for reddit_like_posts, 'comment' for reddit_like_comments. Determines which aggregation path was used.
     */
    activity_type: string;

    /**
     * Activity title (post title for posts, associated post title for comments).
     *
     * @x-autobe-specification For post activities: direct mapping from reddit_like_posts.title. For comment activities: derived from associated post title.
     */
    title: string;

    /**
     * Activity content body (post content or comment content).
     *
     * @x-autobe-specification For post activities: direct mapping from reddit_like_posts.content. For comment activities: direct mapping from reddit_like_comments.content.
     */
    content: string;

    /**
     * Author of the activity (post or comment creator).
     *
     * @x-autobe-specification Join from reddit_like_posts.member_id or reddit_like_comments.member_id to reddit_like_members. Returns IRedditLikeMember.ISummary with public profile data.
     */
    author: IRedditLikeMember.ISummary;

    /**
     * Community where the activity was posted.
     *
     * @x-autobe-specification Join from reddit_like_posts.community_name to reddit_like_communities. Returns IRedditLikeCommunity.ISummary with community summary data.
     */
    community: IRedditLikeCommunity.ISummary;

    /**
     * Timestamp when the activity was created.
     *
     * @x-autobe-specification Direct mapping from reddit_like_posts.created_at or reddit_like_comments.created_at depending on activity type.
     */
    created_at: string;
  };
}
