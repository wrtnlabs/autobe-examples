import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_subscribed_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create 3 test communities
  const community1 =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "community_1_" + RandomGenerator.alphaNumeric(4),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community1);
  const community2 =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "community_2_" + RandomGenerator.alphaNumeric(4),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community2);
  const community3 =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "community_3_" + RandomGenerator.alphaNumeric(4),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community3);
  // Wait to ensure different subscribed_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Subscribe to community_1 first
  const sub1 = await api.functional.redditPlatform.member.communities.subscribe(
    memberConnection,
    {
      communityId: community1.id,
      body: { confirmSubscription: true },
    },
  );
  typia.assert(sub1);
  // Wait to ensure different subscribed_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Subscribe to community_2 second
  const sub2 = await api.functional.redditPlatform.member.communities.subscribe(
    memberConnection,
    {
      communityId: community2.id,
      body: { confirmSubscription: true },
    },
  );
  typia.assert(sub2);
  // Wait to ensure different subscribed_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Subscribe to community_3 third
  const sub3 = await api.functional.redditPlatform.member.communities.subscribe(
    memberConnection,
    {
      communityId: community3.id,
      body: { confirmSubscription: true },
    },
  );
  typia.assert(sub3);
  // Test 1: Sort by newest, page 1, limit 2
  const newestPage1Response =
    await api.functional.redditPlatform.member.users.me.communities.subscribed.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 2,
          sort: "newest",
        },
      },
    );
  typia.assert(newestPage1Response);
  TestValidator.equals(
    "newest page 1 data count",
    newestPage1Response.data.length,
    2,
  );
  TestValidator.equals(
    "newest page 1 first should be community_3",
    newestPage1Response.data[0].id,
    community3.id,
  );
  TestValidator.equals(
    "newest page 1 second should be community_2",
    newestPage1Response.data[1].id,
    community2.id,
  );
  TestValidator.equals(
    "newest page 1 pagination current",
    newestPage1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "newest page 1 pagination limit",
    newestPage1Response.pagination.limit,
    2,
  );
  TestValidator.equals(
    "newest page 1 pagination records",
    newestPage1Response.pagination.records,
    3,
  );
  TestValidator.equals(
    "newest page 1 pagination pages",
    newestPage1Response.pagination.pages,
    2,
  );
  // Test 2: Sort by oldest
  const oldestResponse =
    await api.functional.redditPlatform.member.users.me.communities.subscribed.index(
      memberConnection,
      {
        body: {
          sort: "oldest",
        },
      },
    );
  typia.assert(oldestResponse);
  TestValidator.equals("oldest data count", oldestResponse.data.length, 3);
  TestValidator.equals(
    "oldest first should be community_1",
    oldestResponse.data[0].id,
    community1.id,
  );
  TestValidator.equals(
    "oldest second should be community_2",
    oldestResponse.data[1].id,
    community2.id,
  );
  TestValidator.equals(
    "oldest third should be community_3",
    oldestResponse.data[2].id,
    community3.id,
  );
  // Test 3: Pagination - page 2, limit 1, newest
  const newestPage2Response =
    await api.functional.redditPlatform.member.users.me.communities.subscribed.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 1,
          sort: "newest",
        },
      },
    );
  typia.assert(newestPage2Response);
  TestValidator.equals(
    "newest page 2 data count",
    newestPage2Response.data.length,
    1,
  );
  TestValidator.equals(
    "newest page 2 should be community_2",
    newestPage2Response.data[0].id,
    community2.id,
  );
  TestValidator.equals(
    "newest page 2 pagination current",
    newestPage2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "newest page 2 pagination limit",
    newestPage2Response.pagination.limit,
    1,
  );
  TestValidator.equals(
    "newest page 2 pagination records",
    newestPage2Response.pagination.records,
    3,
  );
  TestValidator.equals(
    "newest page 2 pagination pages",
    newestPage2Response.pagination.pages,
    3,
  );
  // Cleanup: Unsubscribe from all communities
  await api.functional.redditPlatform.member.communities.unsubscribe(
    memberConnection,
    {
      communityId: community1.id,
    },
  );
  await api.functional.redditPlatform.member.communities.unsubscribe(
    memberConnection,
    {
      communityId: community2.id,
    },
  );
  await api.functional.redditPlatform.member.communities.unsubscribe(
    memberConnection,
    {
      communityId: community3.id,
    },
  );
}