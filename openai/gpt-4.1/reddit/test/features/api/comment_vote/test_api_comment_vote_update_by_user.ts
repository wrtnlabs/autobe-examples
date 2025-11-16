import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Test updating a user vote on a comment.
 *
 * This test covers the scenario where a user, after joining and creating a
 * comment, casts a vote (up or down) and then updates that vote to the opposite
 * type. The test validates:
 *
 * - Only one vote per user per comment is enforced
 * - The vote_type is updated after the update operation
 * - Created_at remains unchanged across update, while updated_at reflects the new
 *   timestamp
 * - The vote record is still associated with the correct user and comment
 */
export async function test_api_comment_vote_update_by_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userJoinBody = {
    email: userEmail,
    password: userPassword,
  } satisfies ICommunityPlatformUser.IJoin;
  const userAuth = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(userAuth);
  TestValidator.predicate(
    "new user has uuid id",
    typeof userAuth.id === "string" && userAuth.id.length > 0,
  );

  // 2. Create a comment (mocked: need a valid post_id)
  const mockPostId = typia.random<string & tags.Format<"uuid">>();
  const commentBody = {
    post_id: mockPostId,
    body: RandomGenerator.paragraph({ sentences: 1, wordMin: 8, wordMax: 16 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    { body: commentBody },
  );
  typia.assert(comment);
  TestValidator.equals(
    "comment has correct post_id",
    comment.post.id,
    mockPostId,
  );

  // 3. Create a comment vote (randomly up or down)
  const initialVoteType = RandomGenerator.pick(["up", "down"] as const);
  const voteCreateBody = {
    community_platform_comment_id: comment.id,
    vote_type: initialVoteType,
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const vote = await api.functional.communityPlatform.user.commentVotes.create(
    connection,
    { body: voteCreateBody },
  );
  typia.assert(vote);
  TestValidator.equals(
    "vote is attached to correct comment",
    vote.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "vote is attached to correct user",
    vote.user.id,
    userAuth.id,
  );
  TestValidator.equals(
    "vote has initial vote_type",
    vote.vote_type,
    initialVoteType,
  );
  TestValidator.predicate(
    "vote has created_at and updated_at",
    typeof vote.created_at === "string" && typeof vote.updated_at === "string",
  );

  // 4. Update the comment vote to the opposite type
  const newVoteType = initialVoteType === "up" ? "down" : "up";
  const updateVoteBody = {
    vote_type: newVoteType,
  } satisfies ICommunityPlatformCommentVote.IUpdate;
  const updatedVote =
    await api.functional.communityPlatform.user.commentVotes.update(
      connection,
      { commentVoteId: vote.id, body: updateVoteBody },
    );
  typia.assert(updatedVote);

  // 5. Assert the vote_type was changed and the audit fields
  TestValidator.equals(
    "vote_type updated to opposite",
    updatedVote.vote_type,
    newVoteType,
  );
  TestValidator.equals("vote id remains the same", updatedVote.id, vote.id);
  TestValidator.equals(
    "comment id remains the same",
    updatedVote.comment.id,
    vote.comment.id,
  );
  TestValidator.equals(
    "user id remains the same",
    updatedVote.user.id,
    vote.user.id,
  );
  TestValidator.equals(
    "created_at remains unchanged after update",
    updatedVote.created_at,
    vote.created_at,
  );
  TestValidator.predicate(
    "updated_at changed after update",
    updatedVote.updated_at !== vote.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null or undefined after update",
    updatedVote.deleted_at ?? null,
    null,
  );
}
