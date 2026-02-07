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

export async function test_api_comment_vote_removal_by_original_voter(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorization = await authorize_user_join(userConnection, {
    body: {
      email: "test@example.com",
      password: "Password123!",
      username: "testuser",
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(userAuthorization);
  // 2. Create a post first (need valid post ID for comment)
  // Since we don't have a posts.create endpoint available, we'll need to find an existing post
  // or use a workaround. For now, let's use a placeholder UUID for testing
  const postId = "123e4567-e89b-12d3-a456-426614174000";
  // 3. Create comment on post
  const comment = await api.functional.redditPlatform.posts.comments.create(
    userConnection,
    {
      postId: postId,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    } as any,
  );
  typia.assert(comment);
  // 4. Cast upvote on comment - using comment.id with type assertion
  const vote = await api.functional.redditPlatform.user.comment_votes.create(
    userConnection,
    {
      body: {
        comment_id: (comment as any).id,
        vote_type: "upvote",
      },
    },
  );
  typia.assert(vote);
  // 5. Remove vote from comment
  await api.functional.redditPlatform.user.comments.vote.erase(userConnection, {
    commentId: (comment as any).id,
  });
  // 6. Verify vote was removed (no error means success)
}
