import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test the complete timesheet approval workflow where a manager with time:approve permission approves a submitted timesheet.
 *
 * Validates the end-to-end timesheet approval process including employee timesheet creation, submission, and manager approval. Ensures that approval properly transitions the timesheet status, records reviewer metadata, and locks timelogs from further editing.
 *
 * Special attention is given to verifying that the reviewer field is populated with the manager's information, the reviewed_at timestamp is set correctly, and the submitted_at timestamp remains unchanged after approval.
 *
 * 1. Manager member account is created with time:approve permission.
 * 2. Employee member account is created for timesheet ownership.
 * 3. Timelog entries are created for the employee with date, duration, and project assignment.
 * 4. Draft timesheet is created for the week containing the timelogs.
 * 5. Timesheet is submitted to transition from draft to submitted status.
 * 6. Manager approves the submitted timesheet.
 * 7. Validates timesheet status is 'approved', reviewer is manager, reviewed_at is set, submitted_at unchanged.
 */
export async function test_api_timesheet_approval_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager account with time:approve permission
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(manager);
  // 2. Create employee account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employee);
  // 3. Create timelog entries for the employee
  const timelogDate = new Date();
  timelogDate.setDate(timelogDate.getDate() - 7); // Use a date from last week
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        date: timelogDate.toISOString(),
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        billable: true,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timelog);
  // 4. Create draft timesheet for the week containing the timelogs
  const weekStartDate = new Date(timelogDate);
  // Adjust to Monday of that week
  const dayOfWeek = weekStartDate.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStartDate.setDate(weekStartDate.getDate() + diffToMonday);
  weekStartDate.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: weekStartDate.toISOString().split("T")[0],
      },
    },
  );
  typia.assert(timesheet);
  // 5. Submit the timesheet (transition from draft to submitted)
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      employeeConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // Validate submission
  TestValidator.equals(
    "status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submittedAt is set",
    submittedTimesheet.submittedAt !== null,
  );
  TestValidator.predicate(
    "reviewer is null before approval",
    submittedTimesheet.reviewer === null,
  );
  const submittedAt = submittedTimesheet.submittedAt;
  // 6. Manager approves the submitted timesheet
  const approvedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.approve(
      managerConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  // 7. Validate approval results
  TestValidator.equals(
    "status after approval",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.equals(
    "reviewer is manager",
    approvedTimesheet.reviewer?.id,
    manager.id,
  );
  TestValidator.predicate(
    "reviewedAt is set",
    approvedTimesheet.reviewedAt !== null,
  );
  TestValidator.equals(
    "submittedAt unchanged",
    approvedTimesheet.submittedAt,
    submittedAt,
  );
  TestValidator.predicate(
    "rejectionReason is null",
    approvedTimesheet.rejectionReason == null,
  );
  TestValidator.predicate(
    "timelogs are included",
    approvedTimesheet.timelogs.length > 0,
  );
}