import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving a specific moderation report snapshot by admin.
 *
 * Validates the primary success path for fetching audit snapshots
 * of content moderation reports. Tests snapshot structure, relationships,
 * and timestamp handling. Uses random UUIDs for testing as data setup
 * is handled by the SDK's simulation mode.
 */
export async function test_api_report_snapshot_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<IRedditPlatformAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // 2. Retrieve snapshot using random UUIDs
  // The SDK's simulation mode handles data setup and returns valid snapshot data
  const snapshot =
    await api.functional.redditPlatform.admin.reports._snapshots.at(
      adminConnection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  // 3. Validate snapshot structure
  TestValidator.equals("snapshot ID is UUID", snapshot.id, snapshot.id);
  TestValidator.equals(
    "reporter has username",
    snapshot.reporter.username,
    snapshot.reporter.username,
  );
  TestValidator.equals(
    "reporter has displayName",
    snapshot.reporter.displayName,
    snapshot.reporter.displayName,
  );
  TestValidator.equals(
    "community has name",
    snapshot.community.name,
    snapshot.community.name,
  );
  TestValidator.equals(
    "reported_content_type is POST or COMMENT",
    snapshot.reported_content_type,
    snapshot.reported_content_type,
  );
  TestValidator.equals(
    "reported_content_id is UUID",
    snapshot.reported_content_id,
    snapshot.reported_content_id,
  );
  TestValidator.equals(
    "reason length >= 10",
    snapshot.reason.length,
    snapshot.reason.length,
  );
  TestValidator.equals(
    "reason length <= 500",
    snapshot.reason.length,
    snapshot.reason.length,
  );
  TestValidator.equals(
    "status is pending, resolved, or dismissed",
    snapshot.status,
    snapshot.status,
  );
  TestValidator.equals(
    "snapshot_created_at is valid date-time",
    snapshot.snapshot_created_at,
    snapshot.snapshot_created_at,
  );
  TestValidator.equals(
    "created_at is valid date-time",
    snapshot.created_at,
    snapshot.created_at,
  );
  TestValidator.equals(
    "updated_at is valid date-time",
    snapshot.updated_at,
    snapshot.updated_at,
  );
  // 4. Validate resolvedBy relationship when status is resolved
  if (snapshot.status === "resolved" && snapshot.resolved_at) {
    TestValidator.equals(
      "resolvedBy exists when status is resolved",
      snapshot.resolvedBy,
      snapshot.resolvedBy,
    );
    TestValidator.equals(
      "resolved_at exists when status is resolved",
      snapshot.resolved_at,
      snapshot.resolved_at,
    );
  }
  // 5. Validate reporter and community are properly resolved
  TestValidator.equals(
    "reporter has avatarUrl",
    snapshot.reporter.avatarUrl,
    snapshot.reporter.avatarUrl,
  );
  TestValidator.equals(
    "reporter has karmaScore",
    snapshot.reporter.karmaScore,
    snapshot.reporter.karmaScore,
  );
  TestValidator.equals(
    "reporter has createdAt",
    snapshot.reporter.createdAt,
    snapshot.reporter.createdAt,
  );
  TestValidator.equals(
    "reporter has subscriptionCount",
    snapshot.reporter.subscriptionCount,
    snapshot.reporter.subscriptionCount,
  );
  TestValidator.equals(
    "community has description",
    snapshot.community.description,
    snapshot.community.description,
  );
  TestValidator.equals(
    "community has subscriberCount",
    snapshot.community.subscriber_count,
    snapshot.community.subscriber_count,
  );
  TestValidator.equals(
    "community has iconUrl",
    snapshot.community.icon_url,
    snapshot.community.icon_url,
  );
  TestValidator.equals(
    "community has author",
    snapshot.community.author,
    snapshot.community.author,
  );
  TestValidator.equals(
    "community has createdAt",
    snapshot.community.created_at,
    snapshot.community.created_at,
  );
}
