import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_subscription_snapshot_retrieval_for_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a random snapshot ID (could be existing or not)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the snapshot
  try {
    const snapshot =
      await api.functional.communityPlatform.admin.subscription_snapshots.at(
        adminConnection,
        { snapshotId },
      );
    // If we reach here, snapshot exists and call succeeded
    typia.assert(snapshot);
    // Validate business logic (not type validation)
    TestValidator.equals("snapshot ID matches", snapshot.id, snapshotId);
    // The subscription ID in the snapshot should match the subscription object's ID
    TestValidator.equals(
      "subscription ID matches subscription object ID",
      snapshot.community_platform_subscription_id,
      snapshot.subscription.id,
    );
    // The user ID in the snapshot should match the subscription member's ID
    TestValidator.equals(
      "user ID matches subscription member ID",
      snapshot.user_id,
      snapshot.subscription.member.id,
    );
    // The community ID in the snapshot should match the subscription community's ID
    TestValidator.equals(
      "community ID matches subscription community ID",
      snapshot.community_id,
      snapshot.subscription.community.id,
    );
    // Validate timestamp consistency: created_at should be a valid ISO string
    TestValidator.predicate(
      "created_at is valid ISO date string",
      () => !isNaN(Date.parse(snapshot.created_at)),
    );
    // If subscribed_at is not null, it should be valid ISO string
    if (snapshot.subscribed_at !== null) {
      TestValidator.predicate(
        "subscribed_at is valid ISO date string",
        () => !isNaN(Date.parse(snapshot.subscribed_at!)),
      );
    }
    // If unsubscribed_at is not null, it should be valid ISO string
    if (snapshot.unsubscribed_at !== null) {
      TestValidator.predicate(
        "unsubscribed_at is valid ISO date string",
        () => !isNaN(Date.parse(snapshot.unsubscribed_at!)),
      );
    }
    // Validate subscription is active matches status? Status is string, active is boolean.
    // We can check that if status is 'active', subscription.active should be true (if mapping known)
    // Since we don't know mapping, skip.
  } catch (error) {
    // Expected error if snapshot doesn't exist
    await TestValidator.httpError("snapshot not found", 404, async () => {
      await api.functional.communityPlatform.admin.subscription_snapshots.at(
        adminConnection,
        { snapshotId },
      );
    });
  }
}
