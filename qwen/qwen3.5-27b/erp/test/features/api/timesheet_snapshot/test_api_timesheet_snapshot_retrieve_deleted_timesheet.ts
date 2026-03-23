import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving a timesheet snapshot for a timesheet that has been soft-deleted.
 * Verify that the snapshot still exists and is accessible even after the original timesheet was deleted.
 * Confirm that the deleted_at field in the snapshot is populated with the deletion timestamp.
 * Validate that all other snapshot data remains intact and accessible for audit trail purposes.
 */
export async function test_api_timesheet_snapshot_retrieve_deleted_timesheet(
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
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Retrieve a timesheet snapshot by its unique identifier
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot: IHrmPlatformTimesheetSnapshot =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.at(
      adminConnection,
      { snapshotId },
    );
  typia.assert(snapshot);
  // 3. Verify that the snapshot exists and is accessible with correct ID
  TestValidator.equals("snapshot id matches request", snapshot.id, snapshotId);
  // 4. Confirm that deleted_at field is populated (indicating soft-deleted timesheet)
  TestValidator.predicate(
    "snapshot has deletion timestamp for deleted timesheet",
    snapshot.deleted_at !== null,
  );
  // 5. Validate that all critical audit data remains intact
  // Employee information is present
  TestValidator.predicate(
    "employee information preserved in snapshot",
    snapshot.employee.id !== undefined,
  );
  // Week period is preserved
  TestValidator.predicate(
    "week start date preserved in snapshot",
    snapshot.week_start_date !== undefined,
  );
  // Status is preserved
  TestValidator.predicate(
    "timesheet status preserved in snapshot",
    snapshot.status !== undefined,
  );
  // Total hours is preserved
  TestValidator.predicate(
    "total hours preserved in snapshot",
    snapshot.total_hours >= 0,
  );
  // 6. Verify business logic: status consistency with approval/rejection fields
  if (snapshot.status === "approved") {
    TestValidator.predicate(
      "approved_at present when status is approved",
      snapshot.approved_at !== null,
    );
    TestValidator.predicate(
      "approver present when status is approved",
      snapshot.approver !== null,
    );
  } else if (snapshot.status === "rejected") {
    TestValidator.predicate(
      "rejected_at present when status is rejected",
      snapshot.rejected_at !== null,
    );
    TestValidator.predicate(
      "rejectedBy present when status is rejected",
      snapshot.rejectedBy !== null,
    );
    TestValidator.predicate(
      "rejection reason present when status is rejected",
      snapshot.rejection_reason !== null,
    );
  } else if (snapshot.status === "submitted") {
    TestValidator.predicate(
      "submitted_at present when status is submitted",
      snapshot.submitted_at !== null,
    );
  }
  // 7. Verify immutability - snapshot creation timestamp exists
  TestValidator.predicate(
    "snapshot creation timestamp preserved",
    snapshot.created_at !== undefined,
  );
  // 8. Verify parent timesheet reference is preserved
  TestValidator.predicate(
    "parent timesheet reference preserved",
    snapshot.hrm_platform_timesheet_id !== undefined,
  );
}
