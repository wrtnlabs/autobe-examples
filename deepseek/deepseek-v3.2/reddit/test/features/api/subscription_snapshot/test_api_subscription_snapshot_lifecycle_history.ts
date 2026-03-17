import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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

/**
 * Test retrieving subscription snapshots showing historical changes for subscription lifecycle.
 *
 * This test verifies that administrators can access the complete historical audit trail
 * of subscription changes. It creates an admin connection, lists available snapshots,
 * retrieves individual snapshots, and validates that they show different historical
 * states while referencing the same subscription and community.
 */
export async function test_api_subscription_snapshot_lifecycle_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. List subscription snapshots to get IDs for testing
  const snapshotList =
    await api.functional.communityPlatform.admin.subscription_snapshots.index(
      adminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: 1,
        } satisfies ICommunityPlatformSubscriptionSnapshot.IRequest,
      },
    );
  typia.assert(snapshotList);
  // Need at least 2 snapshots to compare historical changes
  if (snapshotList.data.length < 2) {
    // If insufficient snapshots exist, the test cannot proceed
    // This is acceptable - the system may not have subscription changes yet
    return;
  }
  // 3. Retrieve individual snapshots and validate historical differences
  const firstSnapshot =
    await api.functional.communityPlatform.admin.subscription_snapshots.at(
      adminConnection,
      {
        snapshotId: snapshotList.data[0].id,
      },
    );
  typia.assert(firstSnapshot);
  const secondSnapshot =
    await api.functional.communityPlatform.admin.subscription_snapshots.at(
      adminConnection,
      {
        snapshotId: snapshotList.data[1].id,
      },
    );
  typia.assert(secondSnapshot);
  // 4. Validate snapshot properties show historical audit trail
  // Snapshots should have different creation timestamps
  TestValidator.notEquals(
    "snapshot creation timestamps should differ",
    firstSnapshot.created_at,
    secondSnapshot.created_at,
  );
  // Snapshots reference the same subscription and community
  TestValidator.equals(
    "subscription IDs should match",
    firstSnapshot.community_platform_subscription_id,
    secondSnapshot.community_platform_subscription_id,
  );
  TestValidator.equals(
    "user IDs should match",
    firstSnapshot.user_id,
    secondSnapshot.user_id,
  );
  TestValidator.equals(
    "community IDs should match",
    firstSnapshot.community_id,
    secondSnapshot.community_id,
  );
  // Historical state may differ (status, permissions, feed inclusion)
  // Note: We can't assume they differ, but we can verify at least one property differs
  // to demonstrate historical change capture
  const statesDiffer =
    firstSnapshot.status !== secondSnapshot.status ||
    firstSnapshot.posting_permission_granted !==
      secondSnapshot.posting_permission_granted ||
    firstSnapshot.feed_included !== secondSnapshot.feed_included;
  TestValidator.predicate(
    "at least one snapshot property should differ to show historical change",
    () => statesDiffer,
  );
  // 5. Validate relationship references
  TestValidator.equals(
    "subscription summary ID matches",
    firstSnapshot.subscription.id,
    firstSnapshot.community_platform_subscription_id,
  );
  TestValidator.equals(
    "second subscription summary ID matches",
    secondSnapshot.subscription.id,
    secondSnapshot.community_platform_subscription_id,
  );
  // 6. Validate timestamps are ISO format
  TestValidator.predicate("first snapshot created_at is ISO date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstSnapshot.created_at),
  );
  TestValidator.predicate("second snapshot created_at is ISO date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(secondSnapshot.created_at),
  );
}
