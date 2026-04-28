import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPostVote } from "../../../../../api/structures/ICommunityPostVote";
import { IPageICommunityPostVote } from "../../../../../api/structures/IPageICommunityPostVote";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteCommunityMemberPostsPostIdVotes } from "../../../../../providers/deleteCommunityMemberPostsPostIdVotes";
import { patchCommunityMemberPostsPostIdVotes } from "../../../../../providers/patchCommunityMemberPostsPostIdVotes";
import { putCommunityMemberPostsPostIdVotes } from "../../../../../providers/putCommunityMemberPostsPostIdVotes";

@Controller("/community/member/posts/:postId/votes")
export class CommunityMemberPostsVotesController {
  /**
   * Cast or update the authenticated member's vote on a specific post.
   *
   * This operation creates or replaces the calling member's vote record on the target post. Each member may hold at most one active vote per post at any given time, enforced by a unique constraint on `(community_member_id, community_post_id)` in the `community_post_votes` table. If the member has not yet voted on this post, a new vote record is created. If the member has already voted with a **different** vote direction, the existing `vote_type` is updated in place. If the member submits the same vote direction they have already cast, the request is rejected — this is not a valid state transition.
   *
   * Vote directions are strictly classified as 'upvote' or 'downvote' as defined in the vote type classification. An upvote increases the post's net vote score by 1 and contributes positively to the post author's karma score; a downvote decreases the net vote score by 1 and negatively impacts karma. When a vote is changed from upvote to downvote, the post score adjusts by −2 and the author's karma adjusts by −2. When changed from downvote to upvote, the adjustments are +2. These changes are applied atomically in a single database transaction.
   *
   * The post author's `karma_score` in the `community_user_profiles` table is incremented or decremented as a denormalized aggregate, and an immutable audit record is appended to `community_user_profile_karma_logs` describing the karma delta event (e.g., 'post_upvote_received', 'post_downvote_received'). No manual karma modification is permitted — karma is exclusively driven by vote events, as enforced by the karma immutability rule.
   *
   * Only authenticated members may call this operation. A member cannot vote on their own post. The post identified by `postId` must exist and must be active (`deleted_at` must be null). If either precondition fails, the request is rejected. Guests cannot vote and will receive an authorization error.
   *
   * To subsequently retract the vote entirely, a separate DELETE operation on the vote resource should be used. To view the current vote score of a post, retrieve the post detail via `GET /posts/{postId}`.
   *
   * @param connection
   * @param postId The UUID of the target post to vote on.
   * @param body The vote direction to cast or update on the specified post.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the calling member from the
     *   session token. Reject if unauthenticated. 2. Validate that `postId` is
     *   a valid UUID and look up the corresponding row in `community_posts`.
     *   Return 404 if not found or if `deleted_at` is not null. 3. Validate
     *   that the authenticated member is NOT the post author
     *   (`community_member_id != caller_id`). Return 403 if the caller is the
     *   post author. 4. Validate the request body `vote_type` is exactly
     *   'upvote' or 'downvote'. Return 422 for invalid values. 5. Begin a
     *   database transaction. 6. Check for an existing row in
     *   `community_post_votes` WHERE `community_member_id = caller_id AND
     *   community_post_id = postId`. - If no existing vote: INSERT a new row
     *   with the given `vote_type`, set `created_at` and `updated_at` to now. -
     *   Determine karma delta: +1 if 'upvote', -1 if 'downvote'. - If existing
     *   vote with same `vote_type`: no-op (return current record without
     *   touching karma). - If existing vote with different `vote_type`: UPDATE
     *   the row's `vote_type` and `updated_at`. - Determine karma delta: +2 if
     *   switching from 'downvote' to 'upvote', -2 if switching from 'upvote' to
     *   'downvote'. 7. If a karma delta is non-zero: a. UPDATE
     *   `community_user_profiles.karma_score` by adding the delta WHERE
     *   `community_member_id = post.community_member_id`. b. UPDATE
     *   `community_user_profiles.updated_at` to now. c. INSERT a row into
     *   `community_user_profile_karma_logs` with: `community_user_profile_id`
     *   (post author's profile), `community_post_vote_id` (the vote row id),
     *   `community_comment_vote_id = null`, `source_type` (e.g.,
     *   'post_upvote_received' or 'post_downvote_received' or
     *   'post_vote_changed'), `delta`, `created_at = now`. 8. Commit the
     *   transaction. 9. Return the resulting `community_post_votes` row as
     *   `ICommunityPostVote`.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put()
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPostVote.IUpdate,
  ): Promise<ICommunityPostVote> {
    try {
      return await putCommunityMemberPostsPostIdVotes({
        member,
        postId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated list of votes cast on a specific post.
   *
   * This operation returns all active vote records associated with the target post identified by `postId`. Each vote record in the `community_post_votes` table represents a single member's current upvote or downvote direction on the post. The unique constraint `(community_member_id, community_post_id)` guarantees that at most one active vote per member per post is stored, so this list reflects the current voting state of all participating members.
   *
   * The response can be filtered by vote direction (`vote_type`: 'upvote' or 'downvote') to separately enumerate upvoters and downvoters. Pagination is supported to handle posts with large numbers of votes. Each item in the response includes the vote direction, the timestamp when the vote was cast or last updated, and a reference to the voting member's public identity.
   *
   * The net vote score of a post is computed as upvotes minus downvotes from this collection. This operation is useful for displaying detailed vote breakdowns on the post detail view, auditing community engagement, or powering vote score calculations consistent with the rules defined in the business requirements: an upvote increases the post author's karma by 1 and a downvote decreases it by 1, and the net score can be negative.
   *
   * Note that this endpoint must be called after identifying the target post via `GET /posts/{postId}` or through a feed listing. The `postId` must correspond to an existing, non-deleted post record in `community_posts`. If the post has been removed (i.e., `deleted_at` is non-null), the system will return an appropriate error.
   *
   * Both authenticated members and unauthenticated guests may access this endpoint since vote counts and individual vote records are publicly visible alongside post content.
   *
   * @param connection
   * @param postId The UUID of the post whose votes are to be retrieved. Must correspond to an existing, active post in community_posts.
   * @param body Pagination, filtering, and sorting parameters for the vote list query.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Validate that `postId` is a valid UUID and
     *   that the corresponding `community_posts` record exists and has a null
     *   `deleted_at`. Return 404 if not found or if deleted. 2. Accept an
     *   optional `IRequest` body with pagination parameters (`page`, `limit`),
     *   an optional `voteType` filter ('upvote' | 'downvote' | undefined for
     *   all), and sort order (e.g., `created_at` descending by default). 3.
     *   Query `community_post_votes` WHERE `community_post_id = postId` AND (if
     *   `voteType` specified) `vote_type = voteType`. 4. Join with
     *   `community_members` to include the voter's `username` and `id` in each
     *   vote summary record. 5. Apply pagination using the standard
     *   cursor/offset pattern and return the paginated result as
     *   `IPageICommunityPostVote.ISummary`. 6. The response includes total
     *   count of votes (and separately upvotes/downvotes if available), current
     *   page info, and the list of vote summaries. 7. No authentication
     *   required; this endpoint is accessible to both guests and authenticated
     *   members. 8. Edge case: if the post has zero votes, return an empty page
     *   result with total count of 0.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPostVote.IRequest,
  ): Promise<IPageICommunityPostVote.ISummary> {
    try {
      return await patchCommunityMemberPostsPostIdVotes({
        member,
        postId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retract the currently authenticated member's vote from a specific post.
   *
   * This operation permanently removes the vote record cast by the authenticated member on the specified post. The `community_post_votes` table enforces a unique constraint on `(community_member_id, community_post_id)`, meaning each member holds at most one active vote per post at any given time. Retracting a vote deletes the corresponding row from the table entirely.
   *
   * Upon successful vote retraction, the net vote score of the targeted post is recalculated (upvotes minus downvotes) based on the remaining votes in `community_post_votes`. In addition, the karma score of the post's author stored in `community_user_profiles` is adjusted to reflect the removal of this vote's contribution, whether it was an upvote or a downvote. A corresponding reversal record is appended to `community_user_profile_karma_logs` to maintain the immutable audit trail of karma delta events.
   *
   * Only authenticated members may retract votes. Guests do not have voting privileges and therefore cannot call this endpoint. A member may only retract their own vote — they cannot remove another member's vote through this endpoint.
   *
   * If the authenticated member has not cast any vote on the specified post, the system will return a not-found error indicating there is no vote to retract. Similarly, if the target post does not exist or has been removed (non-null `deleted_at` in `community_posts`), the request will be rejected with an appropriate error response.
   *
   * Related operations: Use the post vote creation endpoint to cast a new vote on a post, or the post vote update endpoint to change an existing vote direction without retracting it. Use the post detail retrieval endpoint to view the current net vote score of a post after retraction.
   *
   * @param connection
   * @param postId The unique identifier (UUID) of the post from which to retract the authenticated member's vote.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the requesting actor; reject with
     *   401 if not a member session. 2. Resolve the target post by postId from
     *   community_posts; return 404 if not found or deleted_at is not null. 3.
     *   Look up the community_post_votes row where community_member_id matches
     *   the authenticated member's ID and community_post_id matches postId. 4.
     *   If no such vote row exists, return 404 (no vote to retract). 5. Within
     *   a database transaction: a. Delete the community_post_votes row. b.
     *   Determine the vote_type of the deleted vote ('upvote' or 'downvote').
     *   c. Adjust the post author's karma score in community_user_profiles:
     *   reverse the karma contribution of the deleted vote (e.g., remove +1 for
     *   upvote or remove -1 for downvote). d. Insert a corresponding reversal
     *   record in community_user_profile_karma_logs to maintain the immutable
     *   audit trail. 6. Commit the transaction. 7. Return 204 No Content on
     *   success.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete()
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityMemberPostsPostIdVotes({
        member,
        postId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
