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
 * Test the successful rejection of a submitted timesheet by a user with time:approve permission.
 *
 * Validates the complete timesheet rejection workflow including employee timesheet creation, submission, and rejection by an authorized approver. Ensures that the rejection properly updates the timesheet status, records the reviewer information, and stores the rejection reason for employee reference.
 *
 * Special attention is given to verifying that the status transitions correctly from submitted to rejected, the reviewer field is populated with the approver's member information, and the rejection reason is properly stored and retrievable.
 *
 * 1. Create approver member account with time:approve permission.
 * 2. Create employee member account and timelog entry.
 * 3. Create draft timesheet containing the timelog for a specific week.
 * 4. Submit the timesheet to transition it to submitted status.
 * 5. Reject the timesheet with a valid rejection reason.
 * 6. Verify rejection response contains correct status, reviewer, reviewed_at, and rejection_reason.
 * 7. Validate business logic: status is rejected, reviewer is approver, reason matches input.
 */
export async function test_api_timesheet_rejection_with_valid_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create approver member (user with time:approve permission)
  const approverConnection: api.IConnection = { host: connection.host };
  const approver = await authorize_member_join(approverConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(approver);
  // 2. Create employee member account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employee);
  // 3. Create timelog entry for the employee
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        billable: true,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timelog);
  // 4. Create draft timesheet for the week containing the timelog
  const weekStartDate = new Date(timelog.date);
  // Adjust to Monday (timesheet week start)
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
  // 5. Submit the timesheet to transition to submitted status
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      employeeConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // Verify timesheet is in submitted status
  TestValidator.equals(
    "status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is set",
    submittedTimesheet.submittedAt !== null,
  );
  // 6. Reject the timesheet with a valid rejection reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 3 });
  const rejectedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.reject(
      approverConnection,
      {
        timesheetId: submittedTimesheet.id,
        body: {
          rejection_reason: rejectionReason,
        } satisfies IHrmPlatformTimesheet.IReject,
      },
    );
  typia.assert(rejectedTimesheet);
  // 7. Validate rejection response
  TestValidator.equals(
    "status after reject",
    rejectedTimesheet.status,
    "rejected",
  );
  TestValidator.equals(
    "reviewer is approver",
    rejectedTimesheet.reviewer?.id,
    approver.id,
  );
  TestValidator.predicate(
    "reviewed_at is set",
    rejectedTimesheet.reviewedAt !== null,
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedTimesheet.rejectionReason,
    rejectionReason,
  );
  TestValidator.equals(
    "submitted_at preserved",
    rejectedTimesheet.submittedAt,
    submittedTimesheet.submittedAt,
  );
  // Verify timelogs are still associated with the timesheet
  TestValidator.predicate(
    "has timelogs",
    rejectedTimesheet.timelogs.length > 0,
  );
  TestValidator.equals(
    "timelog count matches",
    rejectedTimesheet.timelogs.length,
    1,
  );
}
