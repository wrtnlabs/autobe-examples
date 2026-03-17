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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_subscription_snapshots_admin_filter_by_community_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 3. Create community using member
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Create subscription (generates snapshot)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        },
      },
    );
  typia.assert(subscription);
  // Wait a moment for snapshot creation
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Get subscription creation time for date range filtering
  const subscriptionTime = new Date(subscription.created_at);
  const startDate = new Date(subscriptionTime.getTime() - 60000).toISOString(); // 1 minute before
  const endDate = new Date(subscriptionTime.getTime() + 60000).toISOString(); // 1 minute after
  // 6. Filter by community_id and date range
  const filteredSnapshots =
    await api.functional.communityPlatform.admin.subscription_snapshots.index(
      adminConnection,
      {
        body: {
          community_id: community.id,
          created_at_start: startDate,
          created_at_end: endDate,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
          sort: "created_at",
        } satisfies ICommunityPlatformSubscriptionSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // 7. Validate filtering results
  TestValidator.predicate(
    "snapshots found within filtered range",
    filteredSnapshots.data.length > 0,
  );
  // Check all returned snapshots belong to the filtered community
  for (const snapshot of filteredSnapshots.data) {
    TestValidator.equals(
      `snapshot ${snapshot.id} community matches filter`,
      snapshot.community.id,
      community.id,
    );
    // Verify snapshot date is within range
    const snapshotDate = new Date(snapshot.created_at);
    const snapshotTime = snapshotDate.getTime();
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();
    TestValidator.predicate(
      `snapshot ${snapshot.id} within date range`,
      snapshotTime >= startTime && snapshotTime <= endTime,
    );
  }
  // 8. Test pagination metadata
  TestValidator.equals(
    "pagination current page",
    filteredSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    filteredSnapshots.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count matches data length",
    filteredSnapshots.pagination.records >= filteredSnapshots.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    filteredSnapshots.pagination.pages >= 1,
  );
  // 9. Test empty results for wrong community
  const wrongCommunityId = typia.random<string & tags.Format<"uuid">>();
  const emptyResults =
    await api.functional.communityPlatform.admin.subscription_snapshots.index(
      adminConnection,
      {
        body: {
          community_id: wrongCommunityId,
          created_at_start: startDate,
          created_at_end: endDate,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies ICommunityPlatformSubscriptionSnapshot.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals(
    "no snapshots for wrong community",
    emptyResults.data.length,
    0,
  );
  // 10. Test empty results for wrong date range (far future)
  const futureStart = new Date(Date.now() + 86400000).toISOString(); // tomorrow
  const futureEnd = new Date(Date.now() + 172800000).toISOString(); // day after tomorrow
  const futureResults =
    await api.functional.communityPlatform.admin.subscription_snapshots.index(
      adminConnection,
      {
        body: {
          community_id: community.id,
          created_at_start: futureStart,
          created_at_end: futureEnd,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies ICommunityPlatformSubscriptionSnapshot.IRequest,
      },
    );
  typia.assert(futureResults);
  TestValidator.equals(
    "no snapshots in future date range",
    futureResults.data.length,
    0,
  );
}
