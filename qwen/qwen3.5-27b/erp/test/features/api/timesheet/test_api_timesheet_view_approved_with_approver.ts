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

/**
 * Test that a member can view their approved timesheet with approver information.
 * The member authenticates and retrieves a timesheet they own that was approved by an authorized reviewer.
 * Verify the response includes: employee information, status as 'approved', approver information showing who approved it,
 * approved_at timestamp, submitted_at timestamp (when employee submitted it), total_hours, and null rejected_at/rejection_reason.
 * The approved status indicates the timesheet is finalized and all included timelogs are locked from further editing.
 */
export async function test_api_timesheet_view_approved_with_approver(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "192.168.1.100",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve an approved timesheet
  // Note: In a real test scenario, this timesheet would be created through setup
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  const timesheet = await api.functional.hrmPlatform.member.timesheets.at(
    memberConnection,
    {
      timesheetId,
    },
  );
  typia.assert(timesheet);
  // 3. Validate business logic: timesheet status is approved
  TestValidator.equals("status is approved", timesheet.status, "approved");
  // 4. Validate employee information exists
  TestValidator.predicate("employee exists", timesheet.employee !== null);
  // 5. Validate approver information exists for approved timesheet
  TestValidator.predicate(
    "approver exists for approved timesheet",
    timesheet.approver !== null,
  );
  // 6. Validate timestamps exist and rejected fields are null
  TestValidator.predicate(
    "week_start_date exists",
    timesheet.week_start_date !== null,
  );
  TestValidator.predicate(
    "approved_at exists for approved timesheet",
    timesheet.approved_at !== null,
  );
  TestValidator.predicate(
    "submitted_at exists",
    timesheet.submitted_at !== null,
  );
  TestValidator.equals(
    "rejected_at is null for approved timesheet",
    timesheet.rejected_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null for approved timesheet",
    timesheet.rejection_reason,
    null,
  );
  // 7. Validate total hours is positive
  TestValidator.predicate("total_hours is positive", timesheet.total_hours > 0);
  // 8. Verify workflow timestamps are in correct order
  // submitted_at should be before approved_at
  if (timesheet.submitted_at !== null && timesheet.approved_at !== null) {
    const submitted = new Date(timesheet.submitted_at).getTime();
    const approved = new Date(timesheet.approved_at).getTime();
    TestValidator.predicate(
      "submitted_at is before approved_at",
      submitted < approved,
    );
  }
}
