import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

export async function test_api_timesheet_reject_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a timelog for the employee
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const timelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        body: {
          hrm_project_id: projectId,
          date: new Date().toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          billable: true,
        } satisfies IHrmTimelog.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(timelog);
  // 3. Create a draft timesheet
  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 1); // Set to Monday
  const timesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          hrm_employee_id: timelog.employee.id,
          week_start_date: weekStartDate.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(timesheet);
  // 4. Submit the timesheet (transition from draft to submitted)
  const submittedTimesheet =
    await api.functional.hrm.member.organizations.timesheets.update(
      memberConnection,
      {
        organizationId,
        timesheetId: timesheet.id,
        body: {
          status: "submitted",
        } satisfies IHrmTimesheetTimelog.IUpdate,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 5. Reject the timesheet with a rejection reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 3 });
  const rejectedTimesheet =
    await api.functional.hrm.member.organizations.timesheets.update(
      memberConnection,
      {
        organizationId,
        timesheetId: timesheet.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IHrmTimesheetTimelog.IUpdate,
      },
    );
  typia.assert(rejectedTimesheet);
  // 6. Validate the timesheet status is now 'rejected' with a non-empty rejection_reason
  TestValidator.equals(
    "timesheet rejected",
    rejectedTimesheet.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason present",
    rejectedTimesheet.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "rejection reason non-empty",
    rejectedTimesheet.rejection_reason !== undefined &&
      rejectedTimesheet.rejection_reason !== null &&
      rejectedTimesheet.rejection_reason.length > 0,
  );
  // 7. Validate that rejection_reason is required when rejecting (negative test)
  await TestValidator.error("rejection reason required", async () => {
    await api.functional.hrm.member.organizations.timesheets.update(
      memberConnection,
      {
        organizationId,
        timesheetId: timesheet.id,
        body: {
          status: "rejected",
          rejection_reason: null,
        } satisfies IHrmTimesheetTimelog.IUpdate,
      },
    );
  });
  // 8. Validate the timesheet can be modified again (since it's back to draft state)
  const updatedTimesheet =
    await api.functional.hrm.member.organizations.timesheets.update(
      memberConnection,
      {
        organizationId,
        timesheetId: timesheet.id,
        body: {
          status: "draft",
          rejection_reason: null,
        } satisfies IHrmTimesheetTimelog.IUpdate,
      },
    );
  typia.assert(updatedTimesheet);
  TestValidator.equals(
    "timesheet back to draft",
    updatedTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "rejection reason cleared",
    updatedTimesheet.rejection_reason,
    null,
  );
}