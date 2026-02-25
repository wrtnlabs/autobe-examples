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

export async function test_api_post_view_tracking_authenticated(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate a user
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // 2. Create a post - use a generic community name that might exist
  // Since we don't have community creation utility, use a simple name
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "general", // Use a common community name
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create first view with engagement metadata
  const firstViewBody = {
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    user_agent: "Mozilla/5.0 Test Browser",
    referrer: typia.random<string & tags.Format<"uri">>(),
    view_duration: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies ICommunityPlatformPostView.ICreate;
  const firstView = await generate_random_community_platform_posts_view_create(
    userConnection,
    {
      body: firstViewBody,
      params: { postId: post.id },
    },
  );
  typia.assert(firstView);
  // 4. Validate first view record
  TestValidator.equals(
    "view has user association",
    firstView.user?.id,
    userAuth.id,
  );
  TestValidator.equals(
    "view has correct post association",
    firstView.post.id,
    post.id,
  );
  TestValidator.equals(
    "ip address matches",
    firstView.ip_address,
    firstViewBody.ip_address,
  );
  TestValidator.equals(
    "user agent matches",
    firstView.user_agent,
    firstViewBody.user_agent,
  );
  TestValidator.equals(
    "referrer matches",
    firstView.referrer,
    firstViewBody.referrer,
  );
  TestValidator.equals(
    "view duration matches",
    firstView.view_duration,
    firstViewBody.view_duration,
  );
  // 5. Create second view with different metadata
  const secondViewBody = {
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    user_agent: "Mozilla/5.0 Different Browser",
    referrer: null,
    view_duration: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies ICommunityPlatformPostView.ICreate;
  const secondView = await generate_random_community_platform_posts_view_create(
    userConnection,
    {
      body: secondViewBody,
      params: { postId: post.id },
    },
  );
  typia.assert(secondView);
  // 6. Validate second view record
  TestValidator.equals(
    "second view has user association",
    secondView.user?.id,
    userAuth.id,
  );
  TestValidator.equals(
    "second view has correct post association",
    secondView.post.id,
    post.id,
  );
  TestValidator.predicate(
    "second view has different id",
    secondView.id !== firstView.id,
  );
  TestValidator.equals(
    "second view ip address matches",
    secondView.ip_address,
    secondViewBody.ip_address,
  );
  TestValidator.equals(
    "second view user agent matches",
    secondView.user_agent,
    secondViewBody.user_agent,
  );
  TestValidator.equals(
    "second view referrer is null",
    secondView.referrer,
    null,
  );
  TestValidator.equals(
    "second view duration matches",
    secondView.view_duration,
    secondViewBody.view_duration,
  );
}
