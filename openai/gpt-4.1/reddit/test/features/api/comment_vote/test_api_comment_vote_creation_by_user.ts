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
 * Validates creation of a comment vote (upvote/downvote) by an authenticated
 * user.
 *
 * This test verifies that an authenticated user can upvote or downvote an
 * existing comment on the platform, enforcing the business rules for comment
 * voting. It covers the full workflow: user self-registration, comment
 * creation, vote creation, uniqueness constraint (one vote per user per
 * comment), and authentication enforcement. It checks:
 *
 * 1. User account registration (join)
 * 2. User creates a comment on a post (comment must exist)
 * 3. User can create a vote (upvote or downvote) on the comment
 * 4. Duplicate votes for the same comment by the same user are rejected
 *    (uniqueness per user/comment)
 * 5. Vote is linked to the correct user and comment
 * 6. Unauthenticated users cannot create votes
 */
export async function test_api_comment_vote_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register genuine user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);

  // 2. Create a post context (simulate, as full post creation is not in scope, so we use a random post id and minimal ISummary shape)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // 3. User creates a comment on the post
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id: postId,
        body: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  TestValidator.equals(
    "comment is created by the correct user",
    comment.author.id,
    user.id,
  );
  TestValidator.equals("comment post id matches", comment.post.id, postId);

  // 4. User upvotes the comment
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
  TestValidator.equals("vote is linked to user", vote.user.id, user.id);
  TestValidator.equals(
    "vote is linked to the comment",
    vote.comment.id,
    comment.id,
  );
  TestValidator.equals("vote type is up", vote.vote_type, "up");

  // 5. User cannot upvote the same comment twice (uniqueness restriction)
  await TestValidator.error(
    "user cannot vote twice on the same comment",
    async () => {
      await api.functional.communityPlatform.user.commentVotes.create(
        connection,
        {
          body: {
            community_platform_comment_id: comment.id,
            vote_type: "up",
          } satisfies ICommunityPlatformCommentVote.ICreate,
        },
      );
    },
  );

  // 6. User cannot downvote the same comment after upvoting (uniqueness restriction)
  await TestValidator.error(
    "user cannot downvote same comment after upvoting",
    async () => {
      await api.functional.communityPlatform.user.commentVotes.create(
        connection,
        {
          body: {
            community_platform_comment_id: comment.id,
            vote_type: "down",
          } satisfies ICommunityPlatformCommentVote.ICreate,
        },
      );
    },
  );

  // 7. Unauthenticated user cannot vote
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot vote on comment",
    async () => {
      await api.functional.communityPlatform.user.commentVotes.create(
        unauthConn,
        {
          body: {
            community_platform_comment_id: comment.id,
            vote_type: "up",
          } satisfies ICommunityPlatformCommentVote.ICreate,
        },
      );
    },
  );
}
