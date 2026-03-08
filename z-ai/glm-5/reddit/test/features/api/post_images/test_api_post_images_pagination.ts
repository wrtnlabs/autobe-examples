import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_images_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create image-type post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.name(),
        contentType: "image",
        textContent: null,
        linkUrl: null,
        imageUrl: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(post);
  // Test 1: Default pagination (no parameters)
  const defaultResponse =
    await api.functional.communityPlatform.posts.images.index(
      memberConnection,
      {
        postId: post.id,
        body: {},
      },
    );
  typia.assert(defaultResponse);
  // Validate default limit is 20
  TestValidator.equals(
    "default limit is 20",
    defaultResponse.pagination.limit,
    20,
  );
  // Validate response structure
  TestValidator.predicate(
    "has data array",
    Array.isArray(defaultResponse.data),
  );
  TestValidator.predicate(
    "has pagination metadata",
    defaultResponse.pagination !== null,
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is positive",
    defaultResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // Test 2: Explicit limit parameter
  const limitResponse =
    await api.functional.communityPlatform.posts.images.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          limit: 5,
        },
      },
    );
  typia.assert(limitResponse);
  TestValidator.equals(
    "custom limit applied",
    limitResponse.pagination.limit,
    5,
  );
  // Test 3: Page parameter
  const pageResponse =
    await api.functional.communityPlatform.posts.images.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(pageResponse);
  TestValidator.equals("page 1 current", pageResponse.pagination.current, 1);
  TestValidator.equals("limit 10 applied", pageResponse.pagination.limit, 10);
  // Test 4: Offset parameter
  const offsetResponse =
    await api.functional.communityPlatform.posts.images.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          offset: 5,
          limit: 10,
        },
      },
    );
  typia.assert(offsetResponse);
  TestValidator.equals(
    "limit applied with offset",
    offsetResponse.pagination.limit,
    10,
  );
  // Test 5: Validate images are ordered by order field (ascending)
  if (defaultResponse.data.length > 1) {
    for (let i = 1; i < defaultResponse.data.length; i++) {
      TestValidator.predicate(
        "images in ascending order",
        defaultResponse.data[i - 1].order <= defaultResponse.data[i].order,
      );
    }
  }
  // Test 6: Validate page calculation
  if (defaultResponse.pagination.records > 0) {
    const expectedPages = Math.ceil(
      defaultResponse.pagination.records / defaultResponse.pagination.limit,
    );
    TestValidator.equals(
      "pages count calculation",
      defaultResponse.pagination.pages,
      expectedPages,
    );
  }
}