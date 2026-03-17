import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_subscription_search_by_status_and_date_ranges(
  connection: api.IConnection,
): Promise<void> {
  // Create member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Create first community
  const community1 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // Create second community
  const community2 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // Create active subscription to first community
  const activeSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community1.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(activeSubscription);
  // Create inactive subscription to second community
  const inactiveSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community2.id,
          active: false,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(inactiveSubscription);
  // Wait to ensure different timestamps for date range testing
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Record timestamp for date range filtering
  const middleTimestamp = new Date().toISOString();
  // Create more subscriptions with different timestamps
  const community3 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community3);
  const laterSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community3.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(laterSubscription);
  // Test 1: Filter by active=true
  const activeOnly = await api.functional.communityPlatform.subscriptions.index(
    memberConnection,
    {
      body: {
        memberId: member.id,
        active: true,
      } satisfies ICommunityPlatformSubscription.IRequest,
    },
  );
  typia.assert(activeOnly);
  TestValidator.equals(
    "active filter returns only active subscriptions",
    activeOnly.data.length,
    2,
  );
  TestValidator.predicate("all returned subscriptions are active", () =>
    activeOnly.data.every((sub) => sub.active === true),
  );
  // Test 2: Filter by active=false
  const inactiveOnly =
    await api.functional.communityPlatform.subscriptions.index(
      memberConnection,
      {
        body: {
          memberId: member.id,
          active: false,
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(inactiveOnly);
  TestValidator.equals(
    "inactive filter returns only inactive subscriptions",
    inactiveOnly.data.length,
    1,
  );
  TestValidator.predicate("all returned subscriptions are inactive", () =>
    inactiveOnly.data.every((sub) => sub.active === false),
  );
  // Test 3: Date range filtering with created_atStart
  const recentSubscriptions =
    await api.functional.communityPlatform.subscriptions.index(
      memberConnection,
      {
        body: {
          memberId: member.id,
          createdAtStart: middleTimestamp,
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(recentSubscriptions);
  TestValidator.equals(
    "date range filter returns subscriptions created after timestamp",
    recentSubscriptions.data.length,
    1,
  );
  TestValidator.equals(
    "correct subscription returned by date range",
    recentSubscriptions.data[0].id,
    laterSubscription.id,
  );
  // Test 4: Combination filter - memberId with status
  const memberActiveSubscriptions =
    await api.functional.communityPlatform.subscriptions.index(
      memberConnection,
      {
        body: {
          memberId: member.id,
          active: true,
          communityId: community1.id,
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(memberActiveSubscriptions);
  TestValidator.equals(
    "combination filter returns specific subscription",
    memberActiveSubscriptions.data.length,
    1,
  );
  TestValidator.equals(
    "correct subscription returned by combination filter",
    memberActiveSubscriptions.data[0].id,
    activeSubscription.id,
  );
  // Test 5: Pagination with filtered results
  const paginatedResults =
    await api.functional.communityPlatform.subscriptions.index(
      memberConnection,
      {
        body: {
          memberId: member.id,
          active: true,
          limit: 1,
          page: 1,
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.equals(
    "pagination limit works with filtered results",
    paginatedResults.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination metadata is correct",
    () =>
      paginatedResults.pagination.limit === 1 &&
      paginatedResults.pagination.current === 1 &&
      paginatedResults.pagination.records >= 2 &&
      paginatedResults.pagination.pages >= 2,
  );
  // Test 6: No filters returns all subscriptions
  const allSubscriptions =
    await api.functional.communityPlatform.subscriptions.index(
      memberConnection,
      {
        body: {
          memberId: member.id,
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(allSubscriptions);
  TestValidator.equals(
    "no filter returns all subscriptions for member",
    allSubscriptions.data.length,
    3,
  );
}
