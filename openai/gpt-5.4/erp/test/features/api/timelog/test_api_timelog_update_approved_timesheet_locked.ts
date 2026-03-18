import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";
import { generate_random_hrm_time_tracking_employee_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timelogs_create";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timelog_update_approved_timesheet_locked(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const employeeConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingManager.IJoin,
  });
  typia.assert(managerAuth);
  const employeeAuth = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(employeeAuth);
  const now = new Date();
  const day = now.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + mondayOffset);
  weekStart.setUTCHours(0, 0, 0, 0);
  const workedOn = new Date(weekStart);
  workedOn.setUTCDate(weekStart.getUTCDate() + 2);
  workedOn.setUTCHours(9, 0, 0, 0);
  const project = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#" + RandomGenerator.alphabets(6),
        status: "active",
        budget_hours: 40,
        start_date: weekStart.toISOString(),
        end_date: null,
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(project);
  const originalDescription = RandomGenerator.paragraph({ sentences: 4 });
  const originalDuration = 120;
  const timelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          hrmTimeTrackingTaskId: null,
          workedOn: workedOn.toISOString(),
          durationMinutes: originalDuration,
          description: originalDescription,
          billable: true,
        } satisfies IHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(timelog);
  const draftTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: weekStart.toISOString(),
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(draftTimesheet);
  TestValidator.equals(
    "draft timesheet status",
    draftTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "draft timesheet employee",
    draftTimesheet.employee.id,
    employeeAuth.id,
  );
  TestValidator.predicate(
    "draft timesheet includes timelog",
    ArrayUtil.has(draftTimesheet.timelogs, (entry) => entry.id === timelog.id),
  );
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.employee.timesheets.submit(
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
  TestValidator.predicate(
    "submitted timesheet has submitted_at",
    submittedTimesheet.submitted_at !== null,
  );
  TestValidator.predicate(
    "submitted timesheet still includes timelog",
    ArrayUtil.has(
      submittedTimesheet.timelogs,
      (entry) => entry.id === timelog.id,
    ),
  );
  const approvedTimesheet =
    await api.functional.hrmTimeTracking.manager.timesheets.approve(
      managerConnection,
      {
        timesheetId: submittedTimesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  TestValidator.equals(
    "approved timesheet status",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.predicate(
    "approved timesheet has reviewed_at",
    approvedTimesheet.reviewed_at !== null,
  );
  TestValidator.predicate(
    "approved timesheet preserves timelog",
    ArrayUtil.has(
      approvedTimesheet.timelogs,
      (entry) => entry.id === timelog.id,
    ),
  );
  TestValidator.equals(
    "approved timesheet total hours preserved",
    approvedTimesheet.total_hours,
    timelog.duration_minutes / 60,
  );
  const approvedTimelog = approvedTimesheet.timelogs.find(
    (entry) => entry.id === timelog.id,
  );
  if (approvedTimelog === undefined) {
    throw new Error("Approved timesheet must include the created timelog.");
  }
  typia.assertGuard(approvedTimelog);
  TestValidator.equals(
    "approved timelog original duration preserved",
    approvedTimelog.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "approved timelog original description preserved",
    approvedTimelog.description,
    timelog.description,
  );
  const updateBody = {
    hrm_time_tracking_project_id: project.id,
    duration_minutes: 180,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    billable: false,
  } satisfies IHrmTimeTrackingTimelog.IUpdate;
  await TestValidator.error(
    "approved timesheet locks included timelog update",
    async () => {
      await api.functional.hrmTimeTracking.employee.timelogs.update(
        employeeConnection,
        {
          timelogId: timelog.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "approved state remains after rejected update",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.predicate(
    "approved review timestamp remains recorded",
    approvedTimesheet.reviewed_at !== null,
  );
  TestValidator.equals(
    "approved historical duration remains unchanged",
    approvedTimelog.duration_minutes,
    originalDuration,
  );
  TestValidator.equals(
    "approved historical description remains unchanged",
    approvedTimelog.description,
    originalDescription,
  );
}
