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
 * Test retrieving a valid timesheet snapshot by its unique identifier.
 * 1. Authenticate as admin
 * 2. Retrieve timesheet snapshot by ID
 * 3. Validate snapshot contains all expected fields and nested objects
 */
export async function test_api_timesheet_snapshot_retrieve_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
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
  // 2. Generate a valid snapshot ID for retrieval
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve timesheet snapshot by ID
  const snapshot: IHrmPlatformTimesheetSnapshot =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.at(
      adminConnection,
      { snapshotId },
    );
  // 4. Validate response structure - typia.assert performs complete type validation
  typia.assert(snapshot);
  // 5. Verify snapshot ID matches the requested ID
  TestValidator.equals(
    "snapshot ID matches requested ID",
    snapshot.id,
    snapshotId,
  );
  // 6. Verify employee summary exists (required field)
  TestValidator.predicate(
    "employee summary is present",
    snapshot.employee !== null,
  );
  // 7. Verify employee has valid member reference
  TestValidator.predicate(
    "employee member email exists",
    snapshot.employee.member.email !== "",
  );
  // 8. Verify week start date is present
  TestValidator.predicate(
    "week start date is present",
    snapshot.week_start_date !== "",
  );
  // 9. Verify status is one of valid values
  const validStatuses = [
    "pending",
    "submitted",
    "approved",
    "rejected",
  ] as const;
  TestValidator.predicate(
    "status is valid",
    validStatuses.includes(snapshot.status as (typeof validStatuses)[number]),
  );
  // 10. Verify total hours is non-negative
  TestValidator.predicate(
    "total hours is non-negative",
    snapshot.total_hours >= 0,
  );
  // 11. Verify created_at timestamp is present
  TestValidator.predicate(
    "created_at timestamp is present",
    snapshot.created_at !== "",
  );
  // 12. Verify approver and rejectedBy are mutually exclusive
  // (a timesheet cannot be both approved and rejected)
  TestValidator.predicate(
    "approver and rejectedBy are mutually exclusive",
    !(snapshot.approver !== null && snapshot.rejectedBy !== null),
  );
  // 13. If rejected, verify rejection_reason is present
  if (snapshot.status === "rejected") {
    TestValidator.predicate(
      "rejection reason exists for rejected status",
      snapshot.rejection_reason !== null,
    );
    TestValidator.predicate(
      "rejection reason is not empty",
      snapshot.rejection_reason !== "",
    );
    TestValidator.predicate(
      "rejected_at exists for rejected status",
      snapshot.rejected_at !== null,
    );
  }
  // 14. If approved, verify approved_at is present
  if (snapshot.status === "approved") {
    TestValidator.predicate(
      "approved_at exists for approved status",
      snapshot.approved_at !== null,
    );
    TestValidator.predicate(
      "approver exists for approved status",
      snapshot.approver !== null,
    );
  }
  // 15. If submitted, verify submitted_at is present
  if (snapshot.status === "submitted") {
    TestValidator.predicate(
      "submitted_at exists for submitted status",
      snapshot.submitted_at !== null,
    );
  }
}
