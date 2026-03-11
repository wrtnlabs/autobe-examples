import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IRedditPlatformPost } from "../../../../../api/structures/IRedditPlatformPost";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { patchRedditPlatformMemberPostsPostIdVote } from "../../../../../providers/patchRedditPlatformMemberPostsPostIdVote";

@Controller("/redditPlatform/member/posts/:postId/vote")
export class RedditplatformMemberPostsVoteController {
  /**
   * Update or cast a vote on a post in the Reddit-like community platform.
   *
   * This operation allows authenticated members to vote on posts by casting an upvote (+1), downvote (-1), or removing their vote (null). When a vote is submitted, the system updates the post's vote_score in real-time, ensuring all users see the current score immediately.
   *
   * The operation handles multiple scenarios:
   *
   * 1. **New Vote**: When a member has not previously voted on a post, this creates a new vote record.
   *
   * 2. **Vote Change**: When a member changes from upvote to downvote or vice versa, the previous vote is updated atomically and the score adjusts by 2 points (+2 or -2 depending on direction).
   *
   * 3. **Vote Removal**: When a member removes their vote (vote_type: null), the post score is adjusted by -1 or +1 to remove the previous vote's contribution.
   *
   * **Security Requirements**:
   *
   * - User must be authenticated with valid session token
   * - Vote must be for a post that exists and is not deleted
   * - Voting is rejected if the post belongs to a community from which the user is banned
   * - User cannot vote on their own posts if platform policy requires this
   *
   * **Error Handling**:
   *
   * - 401 Unauthorized: Missing or invalid authentication token
   * - 404 Not Found: Post does not exist or has been deleted
   * - 409 Conflict: User is banned from the post's community
   * - 400 Bad Request: Invalid vote_type value (must be UPVOTE, DOWNVOTE, or null)
   *
   * **Performance Considerations**:
   *
   * - Vote score updates are atomic to prevent race conditions from concurrent voting
   * - Score calculation is real-time without caching delays
   * - Multiple concurrent votes from different users are processed independently
   * - Vote conflicts for the same user-content pair use the most recent operation based on server timestamp
   *
   * @param connection
   * @param postId The UUID of the post to vote on
   * @param body Vote update parameters specifying the vote type to cast or remove
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification PATCH /posts/{postId}/vote - Update vote for a post
   *
   * **Request Flow**:
   *
   * 1. Validate JWT token and extract user_id from authentication middleware
   * 2. Validate postId parameter is valid UUID format
   * 3. Verify post exists by querying reddit_platform_posts WHERE id = postId
   * 4. Check if post.deleted_at is not null → return 404 error
   * 5. Query reddit_platform_posts JOIN reddit_platform_communities ON post.community_id = community.id
   * 6. Check if community.id is in user's banned list (reddit_platform_community_bans)
   *    → If banned, return 409 Conflict error with "banned from community"
   * 7. Check if existing vote exists in reddit_platform_votes WHERE user_id = current_user AND post_id = postId
   * 8. If vote exists:
   *    - Update vote_type in reddit_platform_votes
   *    - Calculate score delta:
   *      * UPVOTE → DOWNVOTE: delta = -2
   *      * DOWNVOTE → UPVOTE: delta = +2
   *      * Any → NULL: delta = -(previous vote value)
   *      * NULL → UPVOTE/DOWNVOTE: delta = +1/-1
   * 9. If vote doesn't exist:
   *    - Insert new record into reddit_platform_votes
   *    - Calculate delta: UPVOTE = +1, DOWNVOTE = -1
   * 10. Update post.vote_score by adding delta in single transaction
   * 11. Update reddit_platform_post_votes.updated_at to current timestamp
   * 12. Return updated post with new vote_score
   *
   * **Concurrent Vote Handling**:
   *
   * - Use optimistic locking with version column if available
   * - If concurrent modification detected, retry vote operation up to 3 times with exponential backoff
   * - If conflict persists after retries, return 409 Conflict error
   * - Vote conflicts are resolved by applying the most recent vote based on server timestamp
   *
   * **Real-time Score Update**:
   *
   * - Score is updated atomically with vote operation
   * - No cache invalidation needed - score is always current
   * - Feed algorithms can immediately use updated vote_score
   *
   * **Validation**:
   *
   * - vote_type must be one of: "UPVOTE", "DOWNVOTE", or null
   * - postId must be valid UUID format
   * - User must have active account (is_active = true)
   * - Post must not be soft-deleted
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async updateVote(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IRedditPlatformPost.IVoteRequest,
  ): Promise<IRedditPlatformPost.ISummary> {
    try {
      return await patchRedditPlatformMemberPostsPostIdVote({
        member,
        postId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
