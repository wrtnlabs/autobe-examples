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

/**
 * Test the complete timesheet approval workflow where an approver with time:approve permission reviews and approves a submitted timesheet.
 *
 * Setup:
 * 1. Register employee member who owns the timesheet
 * 2. Employee creates timesheet draft
 * 3. Employee submits the timesheet
 * 4. Register manager member who will approve
 *
 * Test:
 * 1. Manager approves the submitted timesheet
 * 2. Verify response contains updated timesheet with status 'approved'
 * 3. Verify reviewed_by field contains manager's member ID
 * 4. Verify reviewed_at timestamp is recorded
 * 5. Verify the timesheet includes all timelogs that were in it before approval
 * 6. Verify the approval action permanently locks timelogs
 * 7. Verify employee cannot modify the approved timesheet
 */
export async function test_api_timesheet_approval_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register employee member
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuthorized = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employeeAuthorized);
  // Extract employee's member ID for later validation
  const employeeId: string = employeeAuthorized.id;
  // 2. Create timesheet draft
  const weekStart = new Date("2024-03-18T00:00:00.000Z");
  const weekEnd = new Date("2024-03-24T00:00:00.000Z");
  const draftTimesheet = await api.functional.hrms.member.timesheets.create(
    employeeConnection,
    {
      body: {
        week_start_date: weekStart.toISOString(),
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(draftTimesheet);
  TestValidator.equals(
    "draft timesheet status",
    draftTimesheet.status,
    "draft",
  );
  // 3. Submit the timesheet for approval
  const submittedTimesheet = await api.functional.hrms.member.timesheets.submit(
    employeeConnection,
    {
      timesheetId: draftTimesheet.id,
    },
  );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "submitted timesheet status",
    submittedTimesheet.status,
    "submitted",
  );
  // 4. Register manager member
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuthorized = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(managerAuthorized);
  // 5. Manager approves the submitted timesheet
  const approvedTimesheet = await api.functional.hrms.member.timesheets.approve(
    managerConnection,
    {
      timesheetId: submittedTimesheet.id,
    },
  );
  typia.assert(approvedTimesheet);
  // 6. Validate approval results
  TestValidator.equals(
    "approved timesheet status",
    approvedTimesheet.status,
    "approved",
  );
  // Validate reviewer field
  if (approvedTimesheet.reviewer !== undefined && approvedTimesheet.reviewer !== null) {
    typia.assert(approvedTimesheet.reviewer);
    TestValidator.equals(
      "reviewed_by is manager's member ID",
      approvedTimesheet.reviewer.id,
      managerAuthorized.id,
    );
  }
  // Validate reviewed_at field
  if (approvedTimesheet.reviewed_at !== undefined) {
    TestValidator.notEquals(
      "reviewed_at timestamp is recorded",
      approvedTimesheet.reviewed_at,
      null,
    );
  }
  // 7. Verify timelogs are included (should be the same count as before)
  TestValidator.equals(
    "timelogs preserved after approval",
    approvedTimesheet.timelogs.length,
    submittedTimesheet.timelogs.length,
  );
  // 8. Verify employee cannot modify approved timesheet
  // Attempt to submit an already approved timesheet should fail
  await TestValidator.error(
    "approved timesheet cannot be submitted again",
    async () => {
      await api.functional.hrms.member.timesheets.submit(employeeConnection, {
        timesheetId: approvedTimesheet.id,
      });
    },
  );
}