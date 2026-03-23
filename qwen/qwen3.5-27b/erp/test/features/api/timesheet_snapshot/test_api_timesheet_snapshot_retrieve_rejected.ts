import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a timesheet snapshot for a rejected timesheet.
 * Validates that rejection details are properly captured in the snapshot including
 * rejectedBy employee, rejection timestamp, and rejection reason.
 */
export async function test_api_timesheet_snapshot_retrieve_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a valid snapshot ID for testing
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the timesheet snapshot
  const snapshot: IHrmPlatformTimesheetSnapshot =
    await api.functional.hrmPlatform.member.timesheet_snapshots.at(
      memberConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate rejection status
  TestValidator.equals("status is rejected", snapshot.status, "rejected");
  // 5. Validate rejection-specific fields are present
  typia.assertGuard(snapshot.rejectedBy!);
  typia.assertGuard(snapshot.rejected_at!);
  typia.assertGuard(snapshot.rejection_reason!);
  TestValidator.equals("approved_at is null", snapshot.approved_at, null);
  // 6. Validate rejectedBy employee information
  TestValidator.equals(
    "rejectedBy has valid ID",
    typeof snapshot.rejectedBy.id,
    "string",
  );
  TestValidator.equals(
    "rejectedBy has employment_type",
    typeof snapshot.rejectedBy.employment_type,
    "string",
  );
  TestValidator.equals(
    "rejectedBy has member",
    snapshot.rejectedBy.member !== null,
    true,
  );
  TestValidator.equals(
    "rejectedBy has role",
    snapshot.rejectedBy.role !== null,
    true,
  );
  // 7. Validate rejection reason is not empty
  TestValidator.predicate(
    "rejection_reason is not empty",
    snapshot.rejection_reason.length > 0,
  );
  // 8. Validate timestamps are valid
  TestValidator.predicate(
    "rejected_at is valid datetime",
    !isNaN(Date.parse(snapshot.rejected_at)),
  );
  TestValidator.predicate(
    "week_start_date is valid datetime",
    !isNaN(Date.parse(snapshot.week_start_date)),
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(snapshot.created_at)),
  );
  // 9. Validate total_hours is non-negative
  TestValidator.predicate(
    "total_hours is non-negative",
    snapshot.total_hours >= 0,
  );
  // 10. Validate employee information in snapshot
  TestValidator.equals(
    "snapshot has employee",
    snapshot.employee !== null,
    true,
  );
  typia.assertGuard(snapshot.employee!);
  TestValidator.equals(
    "employee has valid ID",
    typeof snapshot.employee.id,
    "string",
  );
  TestValidator.equals(
    "employee has member",
    snapshot.employee.member !== null,
    true,
  );
  // 11. Validate snapshot metadata
  TestValidator.equals(
    "snapshot has timesheet reference",
    typeof snapshot.hrm_platform_timesheet_id,
    "string",
  );
  TestValidator.equals("snapshot has valid ID", typeof snapshot.id, "string");
}
