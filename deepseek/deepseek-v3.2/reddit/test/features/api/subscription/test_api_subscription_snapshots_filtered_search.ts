import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionSnapshot";
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

export async function test_api_subscription_snapshots_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
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
  // Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create initial subscription
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Toggle status multiple times to generate snapshots
  // First toggle: active -> inactive
  const updatedInactive =
    await api.functional.communityPlatform.member.subscriptions.status(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          active: false,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(updatedInactive);
  // Wait a bit to get different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Second toggle: inactive -> active
  const updatedActive =
    await api.functional.communityPlatform.member.subscriptions.status(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          active: true,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(updatedActive);
  // Wait a bit to get different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Third toggle: active -> inactive
  const updatedInactive2 =
    await api.functional.communityPlatform.member.subscriptions.status(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          active: false,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(updatedInactive2);
  // Get current time for date range filtering
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  // Test 1: Empty filter - get all snapshots for authenticated user
  const emptyFilterResult =
    await api.functional.communityPlatform.member.subscription_snapshots.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformSubscriptionSnapshot.IRequest,
      },
    );
  typia.assert(emptyFilterResult);
  TestValidator.predicate(
    "empty filter returns some snapshots",
    emptyFilterResult.data.length > 0,
  );
  TestValidator.predicate(
    "pagination metadata exists",
    emptyFilterResult.pagination.records >= emptyFilterResult.data.length,
  );
  // Test 2: Filter by status
  const statusFilterResult =
    await api.functional.communityPlatform.member.subscription_snapshots.index(
      memberConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformSubscriptionSnapshot.IRequest,
      },
    );
  typia.assert(statusFilterResult);
  if (statusFilterResult.data.length > 0) {
    TestValidator.predicate(
      "all filtered snapshots have active status",
      statusFilterResult.data.every((snapshot) => snapshot.status === "active"),
    );
  }
  // Test 3: Filter by posting_permission_granted
  const permissionFilterResult =
    await api.functional.communityPlatform.member.subscription_snapshots.index(
      memberConnection,
      {
        body: {
          posting_permission_granted: true,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformSubscriptionSnapshot.IRequest,
      },
    );
  typia.assert(permissionFilterResult);
  if (permissionFilterResult.data.length > 0) {
    TestValidator.predicate(
      "all filtered snapshots have posting permission granted",
      permissionFilterResult.data.every(
        (snapshot) => snapshot.posting_permission_granted === true,
      ),
    );
  }
  // Test 4: Filter by date range for created_at
  const dateRangeFilterResult =
    await api.functional.communityPlatform.member.subscription_snapshots.index(
      memberConnection,
      {
        body: {
          created_at_start: oneHourAgo,
          created_at_end: now,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformSubscriptionSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeFilterResult);
  if (dateRangeFilterResult.data.length > 0) {
    TestValidator.predicate(
      "all filtered snapshots within date range",
      dateRangeFilterResult.data.every((snapshot) => {
        const createdAt = new Date(snapshot.created_at).getTime();
        const start = new Date(oneHourAgo).getTime();
        const end = new Date(now).getTime();
        return createdAt >= start && createdAt <= end;
      }),
    );
  }
  // Test 5: Combined filter - status AND date range
  const combinedFilterResult =
    await api.functional.communityPlatform.member.subscription_snapshots.index(
      memberConnection,
      {
        body: {
          status: "active",
          created_at_start: oneHourAgo,
          created_at_end: now,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformSubscriptionSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  if (combinedFilterResult.data.length > 0) {
    TestValidator.predicate(
      "combined filter: all snapshots have active status and within date range",
      combinedFilterResult.data.every((snapshot) => {
        const statusMatch = snapshot.status === "active";
        const createdAt = new Date(snapshot.created_at).getTime();
        const start = new Date(oneHourAgo).getTime();
        const end = new Date(now).getTime();
        const dateMatch = createdAt >= start && createdAt <= end;
        return statusMatch && dateMatch;
      }),
    );
  }
  // Test 6: Filter with pagination
  const paginationFilterResult =
    await api.functional.communityPlatform.member.subscription_snapshots.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformSubscriptionSnapshot.IRequest,
      },
    );
  typia.assert(paginationFilterResult);
  TestValidator.equals(
    "pagination limit respected",
    paginationFilterResult.data.length,
    Math.min(2, paginationFilterResult.pagination.records),
  );
  TestValidator.predicate(
    "page count at least 1",
    paginationFilterResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "current page is 1",
    paginationFilterResult.pagination.current === 1,
  );
}
