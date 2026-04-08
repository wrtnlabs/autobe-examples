import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscriptionSnapshot";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunitySubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscriptionSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_subscription_snapshots_filter_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create subscription to generate initial snapshots
  const subscriptionConnection: api.IConnection = { host: connection.host };
  subscriptionConnection.headers = { Authorization: member.token.access };
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      subscriptionConnection,
      {
        body: {
          reddit_community_communities_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 3. Test sorting by createdAt (ascending)
  const sortCreatedAsc =
    await api.functional.redditCommunity.member.subscriptions.snapshots.index(
      subscriptionConnection,
      {
        subscriptionId: subscription.id,
        body: {
          sort: "createdAt",
          sortOrder: "asc",
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(sortCreatedAsc);
  // Verify sorting order for createdAt ascending
  for (let i = 1; i < sortCreatedAsc.data.length; i++) {
    const prev = sortCreatedAsc.data[i - 1];
    const curr = sortCreatedAsc.data[i];
    TestValidator.predicate(
      "createdAt ascending order - index " + i,
      new Date(prev.created_at) <= new Date(curr.created_at),
    );
  }
  // 4. Test sorting by createdAt (descending)
  const sortCreatedDesc =
    await api.functional.redditCommunity.member.subscriptions.snapshots.index(
      subscriptionConnection,
      {
        subscriptionId: subscription.id,
        body: {
          sort: "createdAt",
          sortOrder: "desc",
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(sortCreatedDesc);
  // Verify sorting order for createdAt descending
  for (let i = 1; i < sortCreatedDesc.data.length; i++) {
    const prev = sortCreatedDesc.data[i - 1];
    const curr = sortCreatedDesc.data[i];
    TestValidator.predicate(
      "createdAt descending order - index " + i,
      new Date(prev.created_at) >= new Date(curr.created_at),
    );
  }
  // 5. Test sorting by updatedAt
  const sortUpdated =
    await api.functional.redditCommunity.member.subscriptions.snapshots.index(
      subscriptionConnection,
      {
        subscriptionId: subscription.id,
        body: {
          sort: "updatedAt",
          sortOrder: "asc",
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(sortUpdated);
  for (let i = 1; i < sortUpdated.data.length; i++) {
    const prev = sortUpdated.data[i - 1];
    const curr = sortUpdated.data[i];
    TestValidator.predicate(
      "updatedAt ascending order - index " + i,
      new Date(prev.updated_at) <= new Date(curr.updated_at),
    );
  }
  // 6. Test sorting by snapshotCreatedAt
  const sortSnapshot =
    await api.functional.redditCommunity.member.subscriptions.snapshots.index(
      subscriptionConnection,
      {
        subscriptionId: subscription.id,
        body: {
          sort: "snapshotCreatedAt",
          sortOrder: "desc",
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(sortSnapshot);
  for (let i = 1; i < sortSnapshot.data.length; i++) {
    const prev = sortSnapshot.data[i - 1];
    const curr = sortSnapshot.data[i];
    TestValidator.predicate(
      "snapshotCreatedAt descending order - index " + i,
      new Date(prev.snapshot_created_at) >= new Date(curr.snapshot_created_at),
    );
  }
  // 7. Test filtering by status
  const statusFilter =
    await api.functional.redditCommunity.member.subscriptions.snapshots.index(
      subscriptionConnection,
      {
        subscriptionId: subscription.id,
        body: {
          status: "active",
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(statusFilter);
  // Validate all filtered results have matching status
  for (const snapshot of statusFilter.data) {
    TestValidator.equals(
      "status filter matches - " + snapshot.id,
      snapshot.deleted_at,
      null,
    );
  }
  // 8. Test date range filtering - snapshotCreatedAtAfter
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7); // 7 days ago
  const dateAfterFilter =
    await api.functional.redditCommunity.member.subscriptions.snapshots.index(
      subscriptionConnection,
      {
        subscriptionId: subscription.id,
        body: {
          snapshotCreatedAtAfter: pastDate.toISOString(),
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(dateAfterFilter);
  // Verify all results are after the specified date
  for (const snapshot of dateAfterFilter.data) {
    TestValidator.predicate(
      "snapshotCreatedAt after filter - " + snapshot.id,
      new Date(snapshot.snapshot_created_at) >= pastDate,
    );
  }
  // 9. Test date range filtering - snapshotCreatedAtBefore
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7); // 7 days in future
  const dateBeforeFilter =
    await api.functional.redditCommunity.member.subscriptions.snapshots.index(
      subscriptionConnection,
      {
        subscriptionId: subscription.id,
        body: {
          snapshotCreatedAtBefore: futureDate.toISOString(),
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(dateBeforeFilter);
  for (const snapshot of dateBeforeFilter.data) {
    TestValidator.predicate(
      "snapshotCreatedAt before filter - " + snapshot.id,
      new Date(snapshot.snapshot_created_at) <= futureDate,
    );
  }
  // 10. Test combined filters (status + sort)
  const combinedFilter =
    await api.functional.redditCommunity.member.subscriptions.snapshots.index(
      subscriptionConnection,
      {
        subscriptionId: subscription.id,
        body: {
          status: "active",
          sort: "snapshotCreatedAt",
          sortOrder: "asc",
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(combinedFilter);
  // Verify filtered results match status
  for (const snapshot of combinedFilter.data) {
    TestValidator.equals(
      "combined filter status matches - " + snapshot.id,
      snapshot.deleted_at,
      null,
    );
  }
  // Verify sort order is maintained
  for (let i = 1; i < combinedFilter.data.length; i++) {
    const prev = combinedFilter.data[i - 1];
    const curr = combinedFilter.data[i];
    TestValidator.predicate(
      "combined filter snapshotCreatedAt ascending - index " + i,
      new Date(prev.snapshot_created_at) <= new Date(curr.snapshot_created_at),
    );
  }
  // 11. Test pagination with filters - limit is handled internally, not passed in body
  const paginationTest =
    await api.functional.redditCommunity.member.subscriptions.snapshots.index(
      subscriptionConnection,
      {
        subscriptionId: subscription.id,
        body: {
          status: "active",
          sort: "createdAt",
          sortOrder: "desc",
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(paginationTest);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginationTest.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records positive or empty data",
    paginationTest.pagination.records > 0 || paginationTest.data.length === 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginationTest.pagination.pages ===
      (paginationTest.pagination.records === 0
        ? 0
        : Math.ceil(
            paginationTest.pagination.records / paginationTest.pagination.limit,
          )),
  );
  // Verify returned data count matches limit
  TestValidator.predicate(
    "returned count within limit",
    paginationTest.data.length <= paginationTest.pagination.limit,
  );
}
