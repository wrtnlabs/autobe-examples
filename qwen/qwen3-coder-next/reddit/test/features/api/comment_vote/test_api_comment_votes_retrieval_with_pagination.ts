import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommentVote";
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
import { generate_random_reddit_platform_user_posts_create } from "../../../generate/generate_random_reddit_platform_user_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_votes_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated test user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // 2. Create a post for comment voting
  const post = await api.functional.redditPlatform.user.posts.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text" as const,
        content_text: RandomGenerator.content({ paragraphs: 3 }),
        community_id: typia.random<string>(),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment = await api.functional.redditPlatform.posts.comments.create(
    userConnection,
    {
      postId: (post as IEntity).id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Retrieve all votes for the comment
  const votesResponse =
    await api.functional.redditPlatform.comments.votes.index(userConnection, {
      commentId: (comment as IEntity).id,
    });
  typia.assert(votesResponse);
  // 5. Validate the paginated response
  TestValidator.equals(
    "has pagination info",
    votesResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate("has data array", Array.isArray(votesResponse.data));
  // 6. Test pagination by requesting different pages
  const page1 = await api.functional.redditPlatform.comments.votes.index(
    userConnection,
    {
      commentId: (comment as IEntity).id,
    },
  );
  typia.assert(page1);
  TestValidator.predicate("page 1 has data", Array.isArray(page1.data));
}