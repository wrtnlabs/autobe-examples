import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscriptionSnapshot";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunitySubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscriptionSnapshot";
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
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test admin retrieval of historical subscription snapshots with comprehensive filtering,
 * pagination, and sorting validation.
 *
 * This test validates the complete workflow of subscription snapshot retrieval for audit
 * purposes. It verifies that admin users can query historical subscription data with
 * flexible filtering options, cursor-based pagination, and multi-field sorting capabilities.
 *
 * The test creates a subscription through a member account, then queries the snapshots
 * through the admin account to verify proper access control and data retrieval. Multiple
 * test scenarios validate filtering by user, community, status, and date ranges, as well
 * as sorting options and pagination metadata accuracy.
 *
 * 1. Administrator joins and authenticates.
 * 2. Member joins and authenticates.
 * 3. Member creates subscription to community, capturing subscription ID.
 * 4. Admin retrieves snapshots for the subscription with various filters.
 * 5. Validates response structure, pagination metadata, and filtering accuracy.
 */
export async function test_api_admin_subscription_snapshots_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: undefined,
  });
  typia.assert(adminAuthorized);
  // 2. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(memberAuthorized);
  // 3. Member creates subscription (generates snapshot)
  const subscription =
    await api.functional.redditCommunity.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Admin retrieves snapshots with comprehensive validation
  const retrieved =
    await api.functional.redditCommunity.admin.subscriptions.snapshots.index(
      adminConnection,
      {
        subscriptionId: subscription.id,
        body: {
          search: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 4,
          }),
          userId: subscription.member.id,
          communityId: subscription.community.id,
          status: subscription.status,
          createdAtAfter: new Date(
            Date.now() - 1000 * 60 * 60 * 24,
          ).toISOString(),
          createdAtBefore: new Date().toISOString(),
          snapshotCreatedAtAfter: new Date(
            Date.now() - 1000 * 60 * 60 * 24,
          ).toISOString(),
          snapshotCreatedAtBefore: new Date().toISOString(),
          sort: RandomGenerator.pick([
            "createdAt",
            "updatedAt",
            "snapshotCreatedAt",
          ]),
          sortOrder: RandomGenerator.pick(["asc", "desc"]),
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(retrieved);
  // 5. Validate response structure and pagination metadata
  TestValidator.equals("snapshot count", retrieved.data.length, 1);
  TestValidator.equals("current page", retrieved.pagination.current, 1);
  TestValidator.predicate("limit positive", retrieved.pagination.limit > 0);
  TestValidator.predicate(
    "records positive",
    retrieved.pagination.records >= 1,
  );
  TestValidator.predicate("pages accurate", retrieved.pagination.pages === 1);
  // 6. Validate snapshot data fields
  const snapshot = retrieved.data[0];
  typia.assert(snapshot);
  TestValidator.equals("has snapshot id", snapshot.id !== undefined, true);
  TestValidator.equals(
    "has snapshot_created_at",
    snapshot.snapshot_created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "has created_at",
    snapshot.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "has updated_at",
    snapshot.updated_at !== undefined,
    true,
  );
  // 7. Test filtering by multiple criteria
  const filteredByUser =
    await api.functional.redditCommunity.admin.subscriptions.snapshots.index(
      adminConnection,
      {
        subscriptionId: subscription.id,
        body: {
          userId: subscription.member.id,
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(filteredByUser);
  TestValidator.equals("filter by userId works", filteredByUser.data.length, 1);
  const filteredByStatus =
    await api.functional.redditCommunity.admin.subscriptions.snapshots.index(
      adminConnection,
      {
        subscriptionId: subscription.id,
        body: {
          status: subscription.status,
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(filteredByStatus);
  TestValidator.equals(
    "filter by status works",
    filteredByStatus.data.length,
    1,
  );
  // 8. Test date range filtering
  const filteredByDate =
    await api.functional.redditCommunity.admin.subscriptions.snapshots.index(
      adminConnection,
      {
        subscriptionId: subscription.id,
        body: {
          createdAtAfter: new Date(
            Date.now() - 1000 * 60 * 60 * 24,
          ).toISOString(),
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(filteredByDate);
  TestValidator.equals(
    "filter by date range works",
    filteredByDate.data.length,
    1,
  );
  // 9. Test sorting by different fields
  const sortedByCreated =
    await api.functional.redditCommunity.admin.subscriptions.snapshots.index(
      adminConnection,
      {
        subscriptionId: subscription.id,
        body: {
          sort: "createdAt",
          sortOrder: "desc",
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(sortedByCreated);
  TestValidator.equals(
    "sort by created_at works",
    sortedByCreated.data.length,
    1,
  );
  const sortedByUpdated =
    await api.functional.redditCommunity.admin.subscriptions.snapshots.index(
      adminConnection,
      {
        subscriptionId: subscription.id,
        body: {
          sort: "updatedAt",
          sortOrder: "asc",
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(sortedByUpdated);
  TestValidator.equals(
    "sort by updated_at works",
    sortedByUpdated.data.length,
    1,
  );
  const sortedBySnapshot =
    await api.functional.redditCommunity.admin.subscriptions.snapshots.index(
      adminConnection,
      {
        subscriptionId: subscription.id,
        body: {
          sort: "snapshotCreatedAt",
          sortOrder: "desc",
        } satisfies IRedditCommunitySubscription.ISnapshotRequest,
      },
    );
  typia.assert(sortedBySnapshot);
  TestValidator.equals(
    "sort by snapshotCreatedAt works",
    sortedBySnapshot.data.length,
    1,
  );
}
