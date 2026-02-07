import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_posts_comments_create } from "../../../generate/generate_random_reddit_platform_posts_comments_create";
import { generate_random_reddit_platform_user_comment_votes_create } from "../../../generate/generate_random_reddit_platform_user_comment_votes_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

export async function test_api_comment_vote_update(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for user operations
  const userConnection: api.IConnection = { host: connection.host };
  // Step 1: Register and login as user
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(2),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // Create new connection with authentication token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    authorization: `Bearer ${userAuth.token.access}`,
  };
  // Use random values since DTOs are empty
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Test the vote update endpoint directly
  // Step 1: Create initial vote
  await api.functional.redditPlatform.user.comment_votes.create(
    authenticatedConnection,
    {
      body: {
        comment_id: commentId,
        vote_type: "upvote",
      } satisfies IRedditPlatformCommentVote.ICreate,
    },
  );
  // Step 2: Update vote from upvote to downvote
  const updatedVote =
    await api.functional.redditPlatform.user.comments.vote.update(
      authenticatedConnection,
      {
        commentId: commentId,
        body: {
          vote_type: "downvote",
        } satisfies IRedditPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // Step 3: Remove vote entirely (set to none)
  const removedVote =
    await api.functional.redditPlatform.user.comments.vote.update(
      authenticatedConnection,
      {
        commentId: commentId,
        body: {
          vote_type: "none",
        } satisfies IRedditPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(removedVote);
  // Step 4: Test attempting to update non-existent vote (should return 404)
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update non-existent vote should throw 404",
    async () => {
      await api.functional.redditPlatform.user.comments.vote.update(
        authenticatedConnection,
        {
          commentId: nonExistentCommentId,
          body: {
            vote_type: "upvote",
          } satisfies IRedditPlatformCommentVote.IUpdate,
        },
      );
    },
  );
}
