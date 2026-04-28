import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformCommentVote } from "../../../../../../api/structures/ICommunityPlatformCommentVote";
import { MemberAuth } from "../../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../../decorators/payload/MemberPayload";
import { deleteCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId } from "../../../../../../providers/deleteCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId";
import { getCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId } from "../../../../../../providers/getCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId";
import { patchCommunityPlatformMemberPostsPostIdCommentsCommentIdVotes } from "../../../../../../providers/patchCommunityPlatformMemberPostsPostIdCommentsCommentIdVotes";
import { postCommunityPlatformMemberPostsPostIdCommentsCommentIdVotes } from "../../../../../../providers/postCommunityPlatformMemberPostsPostIdCommentsCommentIdVotes";
import { putCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId } from "../../../../../../providers/putCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId";

@Controller("/communityPlatform/member/posts/:postId/comments/:commentId/votes")
export class CommunityplatformMemberPostsCommentsVotesController {
  /**
   * Cast a vote on a specific comment inside a specific post discussion.
   *
   * This endpoint records the authenticated member’s current vote direction for the target comment identified by both `postId` and `commentId`. The comment is part of a threaded discussion under a post; therefore, scoping the operation by `postId` ensures that the comment is being voted on within the correct post context.
   *
   * The operation implements the platform rule that comment vote score is computed from the set of votes associated with a comment. After the vote is recorded, the comment’s vote score used by post comment list ordering (for “Best”, “New”, and “Controversial” sorting modes) must reflect the updated voting outcome.
   *
   * Authorization: only logged-in members are allowed to vote. Guests cannot vote. Admin actors are not part of the user-facing voting workflow for normal comment interactions.
   *
   * Validation and error handling:
   *
   * - The system validates that the requested post exists in normal viewing contexts; if the post does not exist, the operation is rejected.
   * - The system validates that the requested comment exists under the given post; if the comment does not exist within that post context, the operation is rejected.
   * - If the member votes on a comment target that is invalid for normal viewing contexts (for example, content that is not queryable in normal views), the system rejects the vote.
   *
   * After a successful vote submission, the response includes the member’s current vote direction and the resulting comment vote score so that the UI can immediately render consistent vote-related UI and ensure comment ordering inputs remain correct.
   *
   * @param connection
   * @param postId Target post ID that scopes the comment voting context.
   * @param commentId Target comment ID within the given post.
   * @param body Vote submission payload indicating the desired vote direction for the target comment.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification In service layer, handle member vote submission
     *   on a comment scoped by post.
   *
   * Algorithm:
   * 1) Authenticate requester as member; otherwise return authorization error.
   * 2) Validate `postId` exists and is queryable in normal viewing contexts.
   * 3) Validate `commentId` exists and belongs to the given `postId`.
   * 4) Upsert the member’s vote row in `community_platform_comment_votes` keyed by unique constraint `comment_id` + `voter_id`.
   *    - If a row exists and its `vote_direction` differs, update `vote_direction` and `voted_at`, and ensure `deleted_at` is cleared if the system treats removed votes as deleted.
   *    - If a row does not exist, create a new row with `vote_direction`, `voter_id`, `comment_id`, and `voted_at`.
   * 5) Compute resulting comment vote score from vote_direction aggregation over non-deleted vote rows for that comment.
   *    - Ensure that the computed score matches ordering semantics for “Best” and “Controversial” comment sorting.
   * 6) Return response DTO containing: `commentId`, member’s vote direction, and updated comment vote score.
   *
   * Database operations:
   * - Transaction: wrap steps 4-5 in a single transaction to keep vote state and score consistent.
   * - Query patterns:
   *   - Select post by id.
   *   - Select comment by id with `community_platform_post_id = postId`.
   *   - Upsert vote by (comment_id, voter_id).
   *   - Aggregate vote score by comment_id (and exclude rows where `deleted_at` is set if treated as removed).
   *
   * Edge cases:
   * - If post does not exist: reject.
   * - If comment does not belong to post: reject.
   * - If vote_direction is invalid per DTO validation: reject at request validation layer.
   *
   * Integration:
   * - No dependency on other endpoints is required; this endpoint directly persists vote state and returns derived score used by comment ordering.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("commentId")
    commentId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformCommentVote.ICreate,
  ): Promise<ICommunityPlatformCommentVote> {
    try {
      return await postCommunityPlatformMemberPostsPostIdCommentsCommentIdVotes(
        {
          member,
          postId,
          commentId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Cast or change the authenticated member’s vote on a specific comment inside a specific post.
   *
   * This operation targets the comment voting data stored in `community_platform_comment_votes`, where each member has at most one active vote per comment (enforced by the unique constraint on `(comment_id, voter_id)`). The table stores the vote direction (`vote_direction`), the vote timing (`voted_at`), and auditing timestamps (`created_at`, `updated_at`). A non-null `deleted_at` indicates the vote has been removed while keeping historical integrity.
   *
   * The endpoint receives `postId` and `commentId` as path parameters so the system can validate that the comment belongs to the specified post before applying the vote. This prevents casting a vote against a comment in a different post context and aligns with the general error-handling principle that invalid targets must be rejected.
   *
   * Authorization: only an authenticated `member` can cast or modify their own comment votes. The system determines the target `voter_id` from the authenticated session identity; the client must not provide `voter_id`.
   *
   * Business rules:
   * - If the member has no existing active vote for the comment, the operation creates a new vote row with the requested `vote_direction` and sets `voted_at`.
   * - If the member has an existing active vote, the operation updates the row to the new `vote_direction` and refreshes `voted_at`/`updated_at`.
   * - If the request indicates “neutral/reset” (implementation-defined mapping to a `vote_direction` value that represents removing the vote), the operation marks the existing vote as removed by setting `deleted_at` and does not leave an active vote row.
   *
   * The updated vote state returned by this operation allows the client to immediately reflect the user’s vote selection and the comment’s vote score used in comment ordering (Best/New/Controversial) across the post’s discussion thread.
   *
   * Error handling:
   * - If the specified post does not exist or is not accessible for the caller’s viewing context, the operation rejects the request.
   * - If the specified comment does not exist, the operation rejects the request.
   * - If the comment exists but does not belong to `postId`, the operation rejects the request.
   *
   * Related operations:
   * - The client can subsequently fetch post comment details (including the updated ordering) using the post’s comment listing/view operation.
   * - Vote ordering for the comment thread is defined by the comment vote score (Best/New/Controversial sorting).
   *
   * @param connection
   * @param postId Target post identifier that provides the context for the comment vote.
   * @param commentId Target comment identifier whose vote is being cast/changed.
   * @param body Vote request specifying the desired voting action/direction for the authenticated member on the target comment.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1) Authentication & identity - Require
     *   authenticated member. - Resolve voterId from the authenticated member
     *   identity (map to community_platform_members.id).
   *
   * 2) Target validation
   * - Load `community_platform_posts` by id = postId, ensure it is not hard-missing.
   * - Load `community_platform_comments` by id = commentId.
   * - Validate comment.community_platform_post_id == postId.
   * - If not found or mismatch, throw a not-found style error (reject request).
   *
   * 3) Request interpretation
   * - Read desired vote action/direction from request body.
   * - Map the request to a `vote_direction Int` value compatible with the vote_direction domain (e.g., upvote vs downvote vs neutral). If request supports neutral/reset, map that to the direction representation or to a “remove vote” action.
   *
   * 4) Upsert/remove logic using `community_platform_comment_votes`
   * - Query for an existing vote row where comment_id = commentId, voter_id = voterId, and deleted_at is null.
   * - If no active row exists:
   *   - If the request is neutral/reset (remove intent), return current neutral state without creating an active vote.
   *   - Else insert a new row:
   *     - comment_id = commentId
   *     - voter_id = voterId
   *     - vote_direction = mapped value
   *     - voted_at = now (Asia/Seoul)
   *     - created_at/updated_at = now
   *     - deleted_at = null
   * - If an active row exists:
   *   - If request is neutral/reset:
   *     - update the row setting deleted_at = now and updated_at = now
   *   - Else update:
   *     - set vote_direction = mapped value
   *     - set voted_at = now
   *     - set updated_at = now
   *
   * 5) Response assembly
   * - Return a vote state summary referencing:
   *   - commentId
   *   - voter-specific vote_direction (or neutral state indicator)
   *   - votedAt (if active) or null (if removed)
   * - Do not compute full comment ordering here; ordering is handled by comment listing operations.
   *
   * 6) Concurrency & transactional integrity
   * - Perform the vote write in a transaction.
   * - Use the unique constraint on (comment_id, voter_id) as the final guard.
   *
   * 7) Edge cases
   * - If request maps to an invalid direction value, reject the request with a validation error.
   * - If post/comment mismatch occurs, reject request.
   *
   * 8) Time handling
   * - Use server time in Asia/Seoul for voted_at/updated_at/deleted_at.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async patchByPostidAndCommentid(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("commentId")
    commentId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformCommentVote.IRequest,
  ): Promise<ICommunityPlatformCommentVote> {
    try {
      return await patchCommunityPlatformMemberPostsPostIdCommentsCommentIdVotes(
        {
          member,
          postId,
          commentId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single member’s vote on a specific comment.
   *
   * This operation is designed for viewing the interaction state stored in community_platform_comment_votes. The target is identified by the combination of path parameters: postId (to scope the discussion), commentId (the specific comment within the post), and voteId (the primary key of the vote record). The response provides the vote direction/value and timing metadata as stored on the vote record, enabling the UI to render the user’s vote state consistently.
   *
   * Because community_platform_comment_votes includes a deleted_at timestamp, the implementation must ensure the returned record matches the platform’s visibility rules for removed votes. If the vote row is marked as deleted_at not null, the service should treat it as removed for the purposes of this endpoint and return a not-found style error (or an equivalent absence result) rather than exposing the removed vote as an active state.
   *
   * Authorization is required in the same way as other member interaction views: guests must not access member vote records, and authenticated access should be limited to the request’s allowed scope (typically the current member’s own vote) while also respecting the public/private visibility of the referenced post and comment.
   *
   * Related operations that work together with this endpoint include comment upvote/downvote endpoints (which create or update the underlying community_platform_comment_votes row and set voted_at accordingly) and comment list/detail endpoints (which display comment vote score ordering and per-user vote state).
   *
   * @param connection
   * @param postId Target post ID that scopes the comment discussion.
   * @param commentId Target comment ID within the post discussion.
   * @param voteId Primary identifier of the comment vote record to retrieve.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation steps: 1) Validate path parameters
     *   as UUIDs. 2) Load the comment from community_platform_comments by
     *   id=commentId and ensure it belongs to the given postId via
     *   community_platform_comments.community_platform_post_id. If mismatch or
     *   missing, return a not-found error. 3) Load
     *   community_platform_comment_votes by id=voteId and comment_id=commentId.
     *   - If no record exists, return not-found. - If deleted_at is not null,
     *   treat the vote as removed: return not-found (do not expose removed vote
     *   direction). 4) Authorization checks: - Resolve the authenticated member
     *   from the session. - Enforce that the requesting actor is allowed to
     *   view this vote record in the current context (at minimum, the
     *   vote.voter_id must match the requesting member id; also enforce that
     *   the post/comment is viewable in general). 5) Return the mapped DTO for
     *   the vote, including vote_direction/value and voted_at as defined by the
     *   DTO for ICommunityPlatformCommentVote.
   *
   * Database access:
   * - Query community_platform_comments for comment existence and post scoping.
   * - Query community_platform_comment_votes for the vote record.
   *
   * No write operations; use a read-only transaction if the service layer supports it.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":voteId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("commentId")
    commentId: string & tags.Format<"uuid">,
    @TypedParam("voteId")
    voteId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformCommentVote> {
    try {
      return await getCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId(
        {
          member,
          postId,
          commentId,
          voteId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Updates a specific member's vote on a given comment within a post.
   *
   * This endpoint operates on the comment-vote relationship stored in `community_platform_comment_votes`, which records `comment_id`, `voter_id`, `vote_direction`, and the timing fields (`voted_at`, `created_at`, `updated_at`). The operation uses the path identifiers to scope the vote to the correct comment thread, matching the discussion model where each `community_platform_comments` row belongs to exactly one post (`community_platform_post_id`) and may optionally reference a parent comment for replies.
   *
   * Security and permission: this operation is intended for the authenticated member who owns the vote or is otherwise authorized by the platform to change that vote. The implementation must validate that the target `commentId` exists and belongs to `postId` before applying changes, and must ensure that the caller can only modify the voter-specific vote record identified for the `voteId`.
   *
   * Validation and business rules: comment voting must update the comment vote score by applying the net effect of changing direction (upvote/downvote/neutral) and must keep karma consistent. When the vote direction changes (including switching from upvote to downvote or removing/resetting), the service layer must compute the resulting score delta and apply it so the comment author’s karma reflects the net effect of the vote change.
   *
   * Sorting display dependency: after a successful vote change, subsequent comment thread retrievals that sort by Best/New/Controversial must reflect the updated comment vote score. Best ordering uses higher vote score first; Controversial ordering prefers many votes but scores close to zero; New ordering uses the comment `posted_at` timestamp.
   *
   * Errors: return a not-found error when the comment does not exist or does not belong to the provided post. Return an authorization error when the caller cannot modify the specified vote record. Return validation errors when the provided vote direction (if present in the request body schema) is invalid.
   *
   *
   * @param connection
   * @param postId Target post ID that scopes the comment thread.
   * @param commentId Target comment ID within the post discussion.
   * @param voteId Identifier of the member's vote record to update.
   * @param body Vote update payload including the desired vote direction for the specified comment.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1) Parse path params: postId, commentId, voteId.
   *
   * 2) Load `community_platform_comments` by id=commentId and verify `community_platform_post_id` == postId.
   *    - If not found, throw NotFound.
   *
   * 3) Load `community_platform_comment_votes` by id=voteId.
   *    - Verify comment_id matches the loaded commentId.
   *    - Verify authorization: the caller is the voter of this vote record (voter_id matches authenticated member id) unless the platform defines broader admin moderation authority.
   *    - If mismatch, throw NotFound (or Authorization depending on convention) and do not reveal existence beyond scope.
   *
   * 4) Apply update: set vote_direction to the requested new direction and update voted_at to now.
   *    - Also update updated_at.
   *    - If the update represents a removal/reset, ensure the record is treated as removed per the table’s `deleted_at` convention (set deleted_at when direction indicates neutral/reset if that is how the system models removal).
   *
   * 5) Karma consistency: compute the score delta for the comment based on the old vs new vote_direction.
   *    - Because karma for comments depends on vote score net effect (positive or negative), apply the delta to the comment author’s karma in the transaction.
   *
   * 6) Return the updated vote record as response.
   *
   * Transaction/edge cases:
   * - Use a single database transaction to ensure atomicity between vote row update and karma adjustment.
   * - If the vote row is already in a removed state per `deleted_at`, handle direction change deterministically (either revive by clearing deleted_at or treat as validation error) according to vote rules.
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":voteId")
  public async putByPostidAndCommentidAndVoteid(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("commentId")
    commentId: string & tags.Format<"uuid">,
    @TypedParam("voteId")
    voteId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformCommentVote.IUpdate,
  ): Promise<ICommunityPlatformCommentVote> {
    try {
      return await putCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId(
        {
          member,
          postId,
          commentId,
          voteId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * This endpoint permanently removes a specific vote record on a comment within the context of a post discussion.
   *
   * The target vote is identified by its voteId, and the operation is scoped by commentId as well. This scoping ensures the deletion cannot accidentally remove a vote from a different comment. The path also includes postId; the implementation should use it to validate that the specified comment indeed belongs to the given post (via the comment’s community_platform_post_id) before performing the deletion.
   *
   * Authorization-wise, only a user who is allowed to manage votes should be permitted to call this endpoint. In the domain model, community_platform_comment_votes represents a single voter’s current vote direction for a comment and is uniquely constrained by (comment_id, voter_id). Therefore, when an authenticated member calls this endpoint, the service should ensure the caller is deleting their own vote record. Moderators/admins, if they are allowed by the project’s permission matrix, should be validated accordingly.
   *
   * Implementation should locate the vote row by id (community_platform_comment_votes.id) and verify it matches the provided comment_id (community_platform_comment_votes.comment_id). Additionally, the implementation should verify the comment’s parent post (community_platform_comments.community_platform_post_id) matches postId. If any of these checks fail, the operation must reject with an appropriate error rather than deleting an unrelated record.
   *
   * When successful, the vote no longer exists in community_platform_comment_votes, so any downstream computations of comment vote counts/scores and moderation/reporting flows should reflect the removal naturally on subsequent reads. Since the vote entity itself supports deleted_at (a timestamp for a removed vote record), the implementation may choose a behavior consistent with the system’s moderation and historical rules; however, this endpoint is defined here as permanently removing the vote resource record as exposed by this API contract.
   *
   * Related operations: clients typically pair this endpoint with vote creation/update endpoints (e.g., casting or changing a comment vote) and with comment list/detail retrieval endpoints so the UI can immediately reflect vote score changes after the deletion.
   *
   * @param connection
   * @param postId Target post ID that scopes the discussion context for the comment.
   * @param commentId Target comment ID whose vote is being removed.
   * @param voteId Target vote record ID to permanently remove.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation steps:
   *
   * 1) Parse path parameters: postId, commentId, voteId.
   *
   * 2) Load community_platform_comment_votes by primary key id = voteId.
   *    - If not found: reject with not found.
   *
   * 3) Validate scoping:
   *    - Ensure the loaded vote row’s comment_id equals the provided commentId.
   *    - If mismatch: reject (treat as not found or forbidden per error conventions).
   *
   * 4) Validate post context:
   *    - Load community_platform_comments by id = commentId.
   *    - Ensure community_platform_comments.community_platform_post_id equals postId.
   *    - If mismatch: reject.
   *
   * 5) Authorization:
   *    - Determine the caller identity from the session.
   *    - If the caller is a normal member, ensure the caller is the voter_id on the loaded vote row.
   *    - If the caller is an admin/moderator, apply the relevant authorization policy; otherwise reject.
   *
   * 6) Deletion behavior:
   *    - Permanently remove the vote row from community_platform_comment_votes.
   *    - Because the table has deleted_at, avoid setting it only unless the platform’s global deletion policy requires historical retention for vote records. For this API contract, permanently remove the vote row.
   *
   * 7) Return success with no response body.
   *
   * Edge cases:
   * - Attempting to delete an already removed vote should result in not found because the vote row no longer exists for the id.
   * - If the provided postId/commentId do not match, do not delete.
   *
   * Database operations:
   * - Use a transaction if your implementation performs multiple reads and the delete.
   * - Reads should use indexes on comment_id and id as available; delete should be by primary key.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":voteId")
  public async eraseCommentVote(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedParam("commentId")
    commentId: string & tags.Format<"uuid">,
    @TypedParam("voteId")
    voteId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityPlatformMemberPostsPostIdCommentsCommentIdVotesVoteId(
        {
          member,
          postId,
          commentId,
          voteId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
