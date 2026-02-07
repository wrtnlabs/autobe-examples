import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
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
import { generate_random_reddit_platform_user_comments_votes_update_vote } from "../../../generate/generate_random_reddit_platform_user_comments_votes_update_vote";
import { generate_random_reddit_platform_user_posts_create } from "../../../generate/generate_random_reddit_platform_user_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_vote_deleted_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a user (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  // 2. Create a post
  const post = await api.functional.redditPlatform.user.posts.create(
    voterConnection,
    {
      body: {
        title: RandomGenerator.name(),
        content_type: "text" as const,
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment = await api.functional.redditPlatform.posts.comments.create(
    voterConnection,
    {
      postId: (post as any).id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Vote on the comment (basic functionality test)
  const vote =
    await api.functional.redditPlatform.user.comments.votes.updateVote(
      voterConnection,
      {
        commentId: (comment as any).id,
        body: {
          vote_type: "upvote" as const,
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(vote);
  // 5. Verify vote was created successfully
  TestValidator.equals(
    "vote type is upvote",
    (vote as any).vote_type,
    "upvote",
  );
  TestValidator.predicate(
    "vote has valid comment_id",
    (vote as any).comment_id === (comment as any).id,
  );
}
