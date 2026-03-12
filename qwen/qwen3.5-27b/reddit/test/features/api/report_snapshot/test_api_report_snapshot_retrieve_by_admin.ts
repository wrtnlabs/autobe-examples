import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated admin can successfully retrieve a specific report snapshot by its UUID.
 *
 * This test verifies that:
 * 1. Admin can authenticate and gain access to report snapshot audit data
 * 2. Admin can retrieve a specific report snapshot by UUID
 * 3. The snapshot contains all required fields with proper nested objects
 */
export async function test_api_report_snapshot_retrieve_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  // 2. Generate a valid snapshot UUID for retrieval
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the report snapshot
  const snapshot: IRedditCloneReportSnapshot =
    await api.functional.redditClone.admin.reports_snapshots.at(
      adminConnection,
      {
        snapshotId,
      },
    );
  // 4. Validate complete response structure
  typia.assert(snapshot);
  // 5. Verify snapshot data integrity
  TestValidator.equals("snapshot ID matches", snapshot.id, snapshotId);
  TestValidator.predicate("reason is non-empty", snapshot.reason.length > 0);
  TestValidator.predicate(
    "status is valid enum value",
    ["pending", "approved", "dismissed"].includes(snapshot.status),
  );
  TestValidator.predicate(
    "target type is valid",
    ["post", "comment"].includes(snapshot.target_type),
  );
  TestValidator.predicate(
    "captured_at is valid datetime",
    snapshot.captured_at.length > 0,
  );
  TestValidator.predicate(
    "report object exists",
    snapshot.report.id.length > 0,
  );
  TestValidator.predicate(
    "reporter object exists",
    snapshot.reporter.id.length > 0,
  );
  TestValidator.predicate(
    "community object exists",
    snapshot.community.id.length > 0,
  );
}
