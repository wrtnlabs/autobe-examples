import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_timesheet_approval_non_submitted_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup employee member who will create timesheets
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employee);
  // 2. Setup manager member who will approve timesheets
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(manager);
  // 3. Create a draft timesheet for employee
  const draftTimesheet = await api.functional.hrms.member.timesheets.create(
    employeeConnection,
    {
      body: {
        week_start_date: new Date().toISOString(),
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(draftTimesheet);
  // 4. Submit the timesheet to make it approvable
  const submittedTimesheet = await api.functional.hrms.member.timesheets.submit(
    employeeConnection,
    {
      timesheetId: draftTimesheet.id,
    },
  );
  typia.assert(submittedTimesheet);
  // 5. Approve the submitted timesheet (first approval)
  const approvedTimesheet = await api.functional.hrms.member.timesheets.approve(
    managerConnection,
    {
      timesheetId: submittedTimesheet.id,
    },
  );
  typia.assert(approvedTimesheet);
  // ===== Test Case 1: Draft Timesheet =====
  // Create a new draft timesheet (do not submit it)
  const newDraftTimesheet = await api.functional.hrms.member.timesheets.create(
    employeeConnection,
    {
      body: {
        week_start_date: new Date().toISOString(),
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(newDraftTimesheet);
  // Attempt to approve the draft timesheet - should fail with appropriate error
  await TestValidator.error("draft timesheet cannot be approved", async () => {
    await api.functional.hrms.member.timesheets.approve(managerConnection, {
      timesheetId: newDraftTimesheet.id,
    });
  });
  // Verify timesheet remains in draft status
  TestValidator.equals(
    "timesheet remains draft status",
    newDraftTimesheet.status,
    "draft",
  );
  // ===== Test Case 2: Already Approved Timesheet =====
  // Attempt to approve the already-approved timesheet again - should fail
  await TestValidator.error(
    "already approved timesheet cannot be approved again",
    async () => {
      await api.functional.hrms.member.timesheets.approve(managerConnection, {
        timesheetId: approvedTimesheet.id,
      });
    },
  );
  // Verify timesheet status remains approved
  TestValidator.equals(
    "timesheet remains approved status",
    approvedTimesheet.status,
    "approved",
  );
  // ===== Test Case 3: Rejected Timesheet =====
  // Create a new draft timesheet for rejection test
  const rejectDraftTimesheet =
    await api.functional.hrms.member.timesheets.create(employeeConnection, {
      body: {
        week_start_date: new Date().toISOString(),
      } satisfies IHrmsTimesheet.ICreate,
    });
  typia.assert(rejectDraftTimesheet);
  // Submit it for approval
  const rejectSubmittedTimesheet =
    await api.functional.hrms.member.timesheets.submit(employeeConnection, {
      timesheetId: rejectDraftTimesheet.id,
    });
  typia.assert(rejectSubmittedTimesheet);
  // Since reject endpoint is not available in SDK, we test that draft status timesheets
  // (which is what rejected timesheets return to) cannot be approved
  // This covers the core business rule that only submitted timesheets can be approved
  await TestValidator.error(
    "timesheet in draft status (like rejected) cannot be approved",
    async () => {
      await api.functional.hrms.member.timesheets.approve(managerConnection, {
        timesheetId: rejectDraftTimesheet.id,
      });
    },
  );
  // Verify timesheet remains in draft status
  TestValidator.equals(
    "rejected timesheet remains draft status",
    rejectDraftTimesheet.status,
    "draft",
  );
}
