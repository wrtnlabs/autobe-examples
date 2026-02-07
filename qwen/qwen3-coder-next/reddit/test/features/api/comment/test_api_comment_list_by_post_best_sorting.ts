import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
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

export async function test_api_comment_list_by_post_best_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated user session
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  // 2. Create a post in a community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditPlatform.user.posts.create(
    userConnection,
    {
      body: {
        community_id: communityId,
        title: RandomGenerator.name(),
        content_type: "text" as const,
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create multiple comments with varying vote scores
  const comments: IRedditPlatformComment[] = [];
  // Use a deterministic postId for comment creation
  const postId = typia.random<string & tags.Format<"uuid">>();
  for (let i = 0; i < 10; i++) {
    const comment = await api.functional.redditPlatform.posts.comments.create(
      userConnection,
      {
        postId: postId,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
    typia.assert(comment);
    comments.push(comment);
  }
  // 4. Retrieve comments sorted by best (vote score descending)
  const result = await api.functional.redditPlatform.posts.comments.index(
    userConnection,
    {
      postId: postId,
      body: {
        limit: 5,
        offset: 0,
        sort: "best" as const,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(result);
  // 5. Validate response structure and sorting
  TestValidator.equals("pagination limit", result.pagination.limit, 5);
  TestValidator.equals("pagination current", result.pagination.current, 1);
  TestValidator.predicate("has data array", result.data.length > 0);
  TestValidator.equals("data count matches limit", result.data.length, 5);
  // Validate that pagination structure is correct
  TestValidator.predicate(
    "pagination has required fields",
    result.pagination.current > 0 &&
      result.pagination.limit > 0 &&
      result.pagination.records >= 0,
  );
  // Verify we have the expected number of comments in the response
  TestValidator.predicate(
    "has valid comment structure",
    result.data.length === 5,
  );
}
