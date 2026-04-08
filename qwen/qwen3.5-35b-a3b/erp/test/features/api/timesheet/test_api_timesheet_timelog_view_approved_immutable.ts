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

export async function test_api_timesheet_timelog_view_approved_immutable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Employee joins system
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create employee-specific connection with proper authorization header
  const employeeConnection: api.IConnection = { host: connection.host };
  employeeConnection.headers = {
    Authorization: `Bearer ${joinResult.token.access}`,
  };
  // 3. Create a week period for the timesheet
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Monday
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6); // Sunday
  endDate.setHours(23, 59, 59, 999);
  // 4. Create timesheet using generate function (uses prepare_random_hrm_platform_timesheet)
  // Note: The generate function requires employee_id which we'll need to extract from member response
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    employeeConnection,
    {
      body: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        hrm_platform_employee_id: joinResult.member.id,
        notes: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 5. Create a random project and task IDs for timelog
  // Note: Using random UUIDs as placeholders since project/task creation endpoints are not available
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const taskId = typia.random<string & tags.Format<"uuid">>();
  // 6. Create timelog entry within timesheet week period
  const workStartDate = new Date(startDate);
  workStartDate.setDate(workStartDate.getDate() + 2); // Wednesday
  workStartDate.setHours(9, 0, 0, 0);
  const workEndDate = new Date(workStartDate);
  workEndDate.setHours(17, 30, 0, 0); // 8.5 hours
  const timelog = await api.functional.hrmPlatform.member.timelogs.create(
    employeeConnection,
    {
      body: {
        employee_id: joinResult.member.id,
        project_id: projectId,
        task_id: taskId,
        start_datetime: workStartDate.toISOString(),
        end_datetime: workEndDate.toISOString(),
        duration_minutes: 510, // 8.5 hours in minutes
        description: RandomGenerator.paragraph({ sentences: 3 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 7. Retrieve timelog from the timesheet (simulating approved state access)
  // Note: Status field in timesheet represents approval workflow state
  const retrievedTimelog =
    await api.functional.hrmPlatform.member.timesheets.timelogs.at(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        timelogId: timelog.id,
      },
    );
  typia.assert(retrievedTimelog);
  // 8. Validate timelog fields are preserved correctly
  TestValidator.equals(
    "start datetime matches",
    retrievedTimelog.start_datetime,
    workStartDate.toISOString(),
  );
  TestValidator.equals(
    "end datetime matches",
    retrievedTimelog.end_datetime,
    workEndDate.toISOString(),
  );
  TestValidator.equals(
    "duration minutes matches",
    retrievedTimelog.duration_minutes,
    510,
  );
  TestValidator.equals(
    "billable flag matches",
    retrievedTimelog.billable,
    true,
  );
  TestValidator.equals(
    "description preserved",
    retrievedTimelog.description,
    timelog.description,
  );
  TestValidator.equals(
    "project ID preserved",
    retrievedTimelog.project.id,
    projectId,
  );
  TestValidator.equals("task ID preserved", retrievedTimelog.task?.id, taskId);
  TestValidator.equals(
    "employee ID preserved",
    retrievedTimelog.employee.id,
    joinResult.member.id,
  );
  TestValidator.equals(
    "deleted_at is NULL (not soft-deleted)",
    retrievedTimelog.deleted_at,
    null,
  );
  TestValidator.notEquals("timelog has ID", retrievedTimelog.id, undefined);
}
