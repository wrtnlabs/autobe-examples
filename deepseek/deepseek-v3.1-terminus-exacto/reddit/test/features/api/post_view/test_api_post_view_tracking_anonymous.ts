import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_posts_view_create } from "../../../generate/generate_random_community_platform_posts_view_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_view } from "../../../prepare/prepare_random_community_platform_post_view";

/**
 * Test anonymous post view tracking functionality.
 *
 * This test verifies that anonymous users can track post views while ensuring:
 * - Authenticated users can create posts
 * - Anonymous views are recorded with null user association
 * - View metadata (IP, user agent, referrer) is properly captured
 * - Post existence validation works correctly
 */
export async function test_api_post_view_tracking_anonymous(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: "test" + RandomGenerator.alphaNumeric(8) + "@example.com",
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 2. Create a post using the authenticated user
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "general",
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create anonymous connection (no authentication)
  const anonymousConnection: api.IConnection = { host: connection.host };
  // 4. Track anonymous view with metadata
  const viewData = {
    ip_address: "192.168.1.1",
    user_agent: "Mozilla/5.0 Test Browser",
    referrer: "https://example.com",
    view_duration: 30,
  } satisfies ICommunityPlatformPostView.ICreate;
  const view = await generate_random_community_platform_posts_view_create(
    anonymousConnection,
    {
      params: { postId: post.id },
      body: viewData,
    },
  );
  typia.assert(view);
  // 5. Validate anonymous view properties
  TestValidator.equals(
    "user field is null for anonymous view",
    view.user,
    null,
  );
  TestValidator.equals("post ID matches", view.post.id, post.id);
  TestValidator.equals(
    "IP address matches input",
    view.ip_address,
    viewData.ip_address,
  );
  TestValidator.equals(
    "user agent matches input",
    view.user_agent,
    viewData.user_agent,
  );
  TestValidator.equals(
    "referrer matches input",
    view.referrer,
    viewData.referrer,
  );
  TestValidator.equals(
    "view duration matches input",
    view.view_duration,
    viewData.view_duration,
  );
  // 6. Test error handling - attempt to view non-existent post
  await TestValidator.error("non-existent post returns error", async () => {
    await api.functional.communityPlatform.posts.view.create(
      anonymousConnection,
      {
        postId: "00000000-0000-0000-0000-000000000000",
        body: viewData,
      },
    );
  });
}
