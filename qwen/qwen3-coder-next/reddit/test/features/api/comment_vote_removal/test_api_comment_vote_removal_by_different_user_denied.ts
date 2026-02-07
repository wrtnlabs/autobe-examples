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

export async function test_api_comment_vote_removal_by_different_user_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create first user connection and authenticate
  const user1Connection: api.IConnection = { host: connection.host };
  await authorize_user_join(user1Connection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  // Create second user connection and authenticate
  const user2Connection: api.IConnection = { host: connection.host };
  await authorize_user_join(user2Connection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  // Create third user connection and authenticate
  const user3Connection: api.IConnection = { host: connection.host };
  await authorize_user_join(user3Connection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  // Create a post with random UUID (using user1 as author)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Create a comment on the post (using user1 as author)
  const commentRaw = await api.functional.redditPlatform.posts.comments.create(
    user1Connection,
    {
      postId: postId,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  // Assert the comment response and cast to type with id property
  const comment = typia.assert<
    IRedditPlatformComment & {
      id: string & tags.Format<"uuid">;
    }
  >(commentRaw);
  // User2 votes on the comment (upvote)
  const vote = await api.functional.redditPlatform.user.comment_votes.create(
    user2Connection,
    {
      body: {
        comment_id: comment.id,
        vote_type: "upvote" as const,
      } satisfies IRedditPlatformCommentVote.ICreate,
    },
  );
  typia.assert(vote);
  // User3 attempts to remove user2's vote - should fail with 403 Forbidden
  await TestValidator.httpError(
    "user3 cannot remove user2's vote",
    403,
    async () => {
      await api.functional.redditPlatform.user.comments.vote.erase(
        user3Connection,
        {
          commentId: comment.id,
        },
      );
    },
  );
}
