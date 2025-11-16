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
 * Validates soft-deletion (erasure) of a user's vote on a comment. Ensures
 * ownership, audit trail, and correct business effects.
 *
 * Business workflow steps:
 *
 * 1. Register a new user (auth join).
 * 2. Create a comment as that user.
 * 3. Cast an upvote on the comment.
 * 4. Erase (soft delete) that vote by its id.
 * 5. Confirm the vote is soft-deleted (deleted_at set), and original vote is now
 *    excluded from active votes/ranking.
 * 6. Error scenarios: user cannot erase a vote that does not exist or that they
 *    don't own.
 */
export async function test_api_comment_vote_erase_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.Format<"password">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);

  // 2. Create a comment as that user
  // Simulate post context for the comment (just needs a valid id)
  // There is no API in the list to create a post or community,
  // so the post_id must be a random UUID.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id: postId,
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Cast an upvote on the comment
  const vote = await api.functional.communityPlatform.user.commentVotes.create(
    connection,
    {
      body: {
        community_platform_comment_id: comment.id,
        vote_type: "up",
      } satisfies ICommunityPlatformCommentVote.ICreate,
    },
  );
  typia.assert(vote);
  TestValidator.equals(
    "vote is active (not soft-deleted)",
    vote.deleted_at,
    null,
  );
  TestValidator.equals("vote_type is up", vote.vote_type, "up");
  TestValidator.equals(
    "vote is for right comment id",
    vote.comment.id,
    comment.id,
  );
  TestValidator.equals("vote user is test user", vote.user.id, user.id);

  // 4. Erase (soft delete) the vote as the same user
  const erased = await api.functional.communityPlatform.user.commentVotes.erase(
    connection,
    {
      commentVoteId: vote.id,
    },
  );
  typia.assert(erased);
  TestValidator.equals(
    "vote id is unchanged after erasure",
    erased.id,
    vote.id,
  );
  TestValidator.equals(
    "vote soft-deleted: deleted_at is set",
    typeof erased.deleted_at,
    "string",
  );
  TestValidator.equals("vote user matches original", erased.user.id, user.id);
  TestValidator.equals(
    "vote comment matches original",
    erased.comment.id,
    comment.id,
  );
  // Soft-deleted vote must not report as "active"
  TestValidator.notEquals(
    "vote is not active after erasure",
    erased.deleted_at,
    null,
  );

  // 5. Attempt to erase again (already deleted) – expect error
  await TestValidator.error("cannot erase already deleted vote", async () => {
    await api.functional.communityPlatform.user.commentVotes.erase(connection, {
      commentVoteId: vote.id,
    });
  });

  // 6. Register a second user and try to erase the first user's vote – expect error
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user2);

  // Now as second user, erasure should fail
  await TestValidator.error(
    "user cannot erase vote they do not own",
    async () => {
      await api.functional.communityPlatform.user.commentVotes.erase(
        connection,
        {
          commentVoteId: vote.id,
        },
      );
    },
  );
}
