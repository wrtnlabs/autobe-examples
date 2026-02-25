import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_analytics_creator_only_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate post creator user
  const creatorConnection: api.IConnection = { host: connection.host };
  const creatorAuth = await authorize_user_join(creatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(creatorAuth);
  // 2. Create and authenticate unauthorized user
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedAuth = await authorize_user_join(unauthorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(unauthorizedAuth);
  // 3. Create community owned by post creator
  const community =
    await generate_random_community_platform_user_communities_create(
      creatorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create post using post creator
  const post = await generate_random_community_platform_user_posts_create(
    creatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Attempt to access analytics with unauthorized user - expect authorization error
  await TestValidator.error("unauthorized analytics access", async () => {
    await api.functional.communityPlatform.user.posts.analytics(
      unauthorizedConnection,
      {
        postId: post.id,
      },
    );
  });
  // 6. Access analytics with post creator - expect successful retrieval
  const analytics = await api.functional.communityPlatform.user.posts.analytics(
    creatorConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(analytics);
  // 7. Validate analytics data structure - only business logic, no type checks
  TestValidator.predicate(
    "has non-negative total views",
    analytics.total_views >= 0,
  );
  TestValidator.predicate(
    "has non-negative unique viewers",
    analytics.unique_viewers >= 0,
  );
  TestValidator.predicate("has non-negative upvotes", analytics.upvotes >= 0);
  TestValidator.predicate(
    "has non-negative downvotes",
    analytics.downvotes >= 0,
  );
  TestValidator.predicate(
    "has non-negative total comments",
    analytics.total_comments >= 0,
  );
}
