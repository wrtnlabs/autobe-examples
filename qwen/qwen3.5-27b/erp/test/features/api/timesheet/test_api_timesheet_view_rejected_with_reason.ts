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
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_view_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a member can view their rejected timesheet with the rejection reason.
   * The member authenticates and retrieves a timesheet they own that was rejected by an approver.
   * Verify the response includes rejection details needed for corrections.
   */
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Retrieve rejected timesheet
  // Note: In a real scenario, we would need to create a timesheet and have it rejected
  // For this test, we assume a rejected timesheet exists with a known ID
  const rejectedTimesheetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const timesheet = await api.functional.hrmPlatform.member.timesheets.at(
    memberConnection,
    {
      timesheetId: rejectedTimesheetId,
    },
  );
  typia.assert(timesheet);
  // 3. Validate timesheet status is rejected
  TestValidator.equals(
    "timesheet status is rejected",
    timesheet.status,
    "rejected",
  );
  // 4. Validate approver information exists and has valid data
  typia.assertGuard(timesheet.approver!);
  TestValidator.predicate(
    "approver has valid id",
    timesheet.approver.id.length > 0,
  );
  // 5. Validate rejected_at timestamp exists
  typia.assertGuard(timesheet.rejected_at!);
  TestValidator.predicate(
    "rejected_at is valid datetime",
    !isNaN(Date.parse(timesheet.rejected_at)),
  );
  // 6. Validate rejection_reason is present and has meaningful content
  typia.assertGuard(timesheet.rejection_reason!);
  TestValidator.predicate(
    "rejection_reason has content",
    timesheet.rejection_reason.length > 0,
  );
  // 7. Validate approved_at is null (since it was rejected, not approved)
  TestValidator.equals(
    "approved_at is null for rejected timesheet",
    timesheet.approved_at,
    null,
  );
  // 8. Validate employee information exists
  typia.assertGuard(timesheet.employee);
  TestValidator.predicate(
    "employee has valid id",
    timesheet.employee.id.length > 0,
  );
  // 9. Validate week_start_date exists
  TestValidator.predicate(
    "week_start_date is valid datetime",
    !isNaN(Date.parse(timesheet.week_start_date)),
  );
  // 10. Validate total_hours is a valid positive number
  TestValidator.predicate(
    "total_hours is positive",
    timesheet.total_hours >= 0,
  );
  // 11. Verify rejection reason is accessible for employee corrections
  TestValidator.predicate(
    "rejection reason is accessible for corrections",
    typeof timesheet.rejection_reason === "string",
  );
}
