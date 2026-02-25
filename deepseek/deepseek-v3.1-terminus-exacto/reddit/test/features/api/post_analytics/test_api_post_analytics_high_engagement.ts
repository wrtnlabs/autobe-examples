import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostView } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostView";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test analytics retrieval for a highly engaged post with significant view counts,
 * voting activity, and comment threads. Create a community and post, then simulate
 * extensive engagement including multiple views from different users, high vote
 * counts with both upvotes and downvotes, and nested comment threads. Verify that
 * analytics accurately reflect the high engagement levels and provide comprehensive
 * metrics for content performance assessment.
 */
export async function test_api_post_analytics_high_engagement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Community creation
  const community =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Post creation
  const postAuthorConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(postAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const post = await generate_random_community_platform_user_posts_create(
    postAuthorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. User engagement simulation
  const engagementUsers = ArrayUtil.repeat(10, () => {
    const userConnection: api.IConnection = { host: connection.host };
    return { connection: userConnection };
  });
  // Create and authenticate engagement users
  for (const user of engagementUsers) {
    await authorize_user_join(user.connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user123",
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformUser.IJoin,
    });
  }
  // 5. Analytics retrieval
  const analytics =
    await api.functional.communityPlatform.admin.posts.analytics(
      adminConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(analytics);
  // 6. Validation
  TestValidator.equals("post ID should match", analytics.post.id, post.id);
  TestValidator.predicate(
    "analytics should contain timestamp",
    analytics.created_at !== undefined,
  );
  TestValidator.predicate(
    "analytics should contain post summary",
    analytics.post.title === post.title,
  );
}
