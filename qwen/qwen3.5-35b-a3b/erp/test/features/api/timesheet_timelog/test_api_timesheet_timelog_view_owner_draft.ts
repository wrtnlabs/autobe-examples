import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
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

export async function test_api_timesheet_timelog_view_owner_draft(
  connection: api.IConnection,
): Promise<void> {
  // 1. Employee joins and authenticates
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    },
  });
  typia.assert(employeeAuth);
  // Extract employee info
  const employeeId = employeeAuth.member.id;
  typia.assert(employeeId);
  // 2. Create draft timesheet for employee using a week from the past
  const weeksBack = 2;
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - weeksBack * 7);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {
      body: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        hrm_platform_employee_id: employeeId,
      },
    },
  );
  typia.assert(timesheet);
  // 3. Create a timelog entry within the timesheet
  // Use a random project ID that would belong to the employee's organization
  // In real scenario, this would be a valid project created earlier
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const workStart = new Date(startDate);
  workStart.setDate(workStart.getDate() + 1);
  const workEnd = new Date(workStart);
  workEnd.setHours(workEnd.getHours() + 8);
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        employee_id: employeeId,
        project_id: projectId,
        task_id: undefined,
        start_datetime: workStart.toISOString(),
        end_datetime: workEnd.toISOString(),
        duration_minutes: 480,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 4. Retrieve the timelog by timesheetId and timelogId
  const retrievedTimelog =
    await api.functional.hrmPlatform.member.timesheets.timelogs.at(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        timelogId: timelog.id,
      },
    );
  typia.assert(retrievedTimelog);
  // 5. Validate timelog fields
  TestValidator.equals("timelog id", retrievedTimelog.id, timelog.id);
  TestValidator.equals(
    "start_datetime",
    retrievedTimelog.start_datetime,
    workStart.toISOString(),
  );
  TestValidator.equals(
    "end_datetime",
    retrievedTimelog.end_datetime,
    workEnd.toISOString(),
  );
  TestValidator.equals(
    "duration_minutes",
    retrievedTimelog.duration_minutes,
    480,
  );
  TestValidator.equals("billable", retrievedTimelog.billable, true);
  TestValidator.equals(
    "description",
    retrievedTimelog.description,
    timelog.description,
  );
  // 6. Validate project reference (note: project may not match created one due to random project_id)
  TestValidator.equals(
    "project id",
    retrievedTimelog.project.id,
    timelog.project.id,
  );
  TestValidator.equals(
    "project name",
    retrievedTimelog.project.name,
    timelog.project.name,
  );
  // 7. Validate employee reference
  TestValidator.equals("employee id", retrievedTimelog.employee.id, employeeId);
  TestValidator.equals(
    "employee display_name",
    retrievedTimelog.employee.display_name,
    employeeAuth.member.display_name,
  );
  // 8. Validate timestamps
  TestValidator.equals(
    "created_at",
    retrievedTimelog.created_at,
    timelog.created_at,
  );
  TestValidator.equals(
    "updated_at",
    retrievedTimelog.updated_at,
    timelog.updated_at,
  );
  // 9. Validate soft-deleted field is NULL
  TestValidator.equals("deleted_at is null", retrievedTimelog.deleted_at, null);
  // 10. Validate task field is nullable when not set
  TestValidator.equals("task is null", retrievedTimelog.task, null);
  // 11. Validate timesheet status is pending (draft)
  TestValidator.equals(
    "timesheet status is pending",
    timesheet.status,
    "pending",
  );
  // 12. Validate all references are consistent after retrieval
  TestValidator.equals(
    "timelog project matches original",
    retrievedTimelog.project.id,
    timelog.project.id,
  );
  TestValidator.equals(
    "timelog employee matches original",
    retrievedTimelog.employee.id,
    timelog.employee.id,
  );
}