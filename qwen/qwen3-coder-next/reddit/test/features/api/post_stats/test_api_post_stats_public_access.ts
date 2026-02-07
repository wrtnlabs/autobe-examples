import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostViewStat";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_user_posts_create } from "../../../generate/generate_random_reddit_platform_user_posts_create";
import { generate_random_reddit_platform_user_reddit_platform_posts_votes_create_vote } from "../../../generate/generate_random_reddit_platform_user_reddit_platform_posts_votes_create_vote";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_post_stats_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  // Generate a random post ID since IRedditPlatformPost DTO has no id property
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Generate engagement on the post using correct API with params structure
  const vote =
    await generate_random_reddit_platform_user_reddit_platform_posts_votes_create_vote(
      userConnection,
      {
        params: { postId: postId },
        body: { type: "up" } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  typia.assert(vote);
  // Call public stats endpoint without authentication
  const stats = await api.functional.redditPlatform.posts.stats(connection, {
    postId: postId,
  });
  typia.assert(stats);
  // Validate statistics structure
  typia.assertGuard(stats);
}
