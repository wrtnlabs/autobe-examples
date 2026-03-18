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
import type { IHrmTimeTrackingTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
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
import { generate_random_hrm_time_tracking_employee_timesheets_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_timelogs_create";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";
import { prepare_random_hrm_time_tracking_timesheet_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet_timelog";

export async function test_api_timesheet_timelogs_approved_history_view(
  connection: api.IConnection,
): Promise<void> {
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(
    16,
  ) satisfies string as string & tags.Format<"password">;
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = RandomGenerator.alphaNumeric(
    16,
  ) satisfies string as string & tags.Format<"password">;
  const href =
    "https://e2e.example.com/hrm/timesheets" satisfies string as string &
      tags.Format<"uri">;
  const referrer = "https://e2e.example.com/hrm" satisfies string as string &
    tags.Format<"uri">;
  const employeeJoinConnection: api.IConnection = { host: connection.host };
  const joinedEmployee = await authorize_employee_join(employeeJoinConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href,
      referrer,
    },
  });
  typia.assert(joinedEmployee);
  const employeeConnection: api.IConnection = { host: connection.host };
  const loggedInEmployee = await authorize_employee_login(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href,
      referrer,
    } satisfies IHrmTimeTrackingEmployee.ILogin,
  });
  typia.assert(loggedInEmployee);
  const managerJoinConnection: api.IConnection = { host: connection.host };
  const joinedManager = await authorize_manager_join(managerJoinConnection, {
    body: {
      email: managerEmail,
      password: managerPassword,
      href,
      referrer,
    },
  });
  typia.assert(joinedManager);
  const managerConnection: api.IConnection = { host: connection.host };
  const loggedInManager = await authorize_manager_login(managerConnection, {
    body: {
      email: managerEmail,
      password: managerPassword,
      href,
      referrer,
    } satisfies IHrmTimeTrackingManager.ILogin,
  });
  typia.assert(loggedInManager);
  const now = new Date();
  const utcDay = now.getUTCDay();
  const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;
  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + diffToMonday,
      0,
      0,
      0,
      0,
    ),
  );
  const workedOn = new Date(
    monday.getTime() + 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const weekStartDate = monday.toISOString();
  const timelogDescription = RandomGenerator.paragraph({ sentences: 3 });
  const timelogDuration = 120 satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const timelogBillable = true;
  const timesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(timesheet);
  const timelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          workedOn,
          durationMinutes: timelogDuration,
          description: timelogDescription,
          billable: timelogBillable,
        },
      },
    );
  typia.assert(timelog);
  const populatedTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_timelogs_create(
      employeeConnection,
      {
        params: {
          timesheetId: timesheet.id,
        },
        body: {
          hrm_time_tracking_timelog_id: timelog.id,
        },
      },
    );
  typia.assert(populatedTimesheet);
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.employee.timesheets.submit(
      employeeConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  const approvedTimesheet =
    await api.functional.hrmTimeTracking.manager.timesheets.approve(
      managerConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  const pageRequest = {
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    worked_from: monday.toISOString(),
    worked_to: new Date(
      monday.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000,
    ).toISOString(),
    billable: timelogBillable,
    search: timelogDescription,
    hrm_time_tracking_project_id: timelog.project.id,
    sort: "worked_on",
  } satisfies IHrmTimeTrackingTimelog.IRequest;
  const page =
    await api.functional.hrmTimeTracking.employee.timesheets.timelogs.index(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        body: pageRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "submitted timesheet id unchanged",
    submittedTimesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "approved timesheet status",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.notEquals(
    "submitted timestamp exists after submit",
    approvedTimesheet.submitted_at,
    null,
  );
  TestValidator.notEquals(
    "reviewed timestamp exists after approval",
    approvedTimesheet.reviewed_at,
    null,
  );
  TestValidator.predicate(
    "approved timesheet retains included timelog",
    approvedTimesheet.timelogs.some((entry) => entry.id === timelog.id),
  );
  TestValidator.equals("requested page reflected", page.pagination.current, 1);
  TestValidator.equals("requested limit reflected", page.pagination.limit, 10);
  TestValidator.predicate(
    "approved timesheet timelog page contains created timelog",
    page.data.some((entry) => entry.id === timelog.id),
  );
  const includedTimelog: IHrmTimeTrackingTimelog.ISummary = typia.assert(
    page.data.find((entry) => entry.id === timelog.id)!,
  );
  TestValidator.equals(
    "included timelog worked_on preserved",
    includedTimelog.worked_on,
    timelog.worked_on,
  );
  TestValidator.equals(
    "included timelog duration preserved",
    includedTimelog.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "included timelog description preserved",
    includedTimelog.description,
    timelog.description,
  );
  TestValidator.equals(
    "included timelog billable preserved",
    includedTimelog.billable,
    timelog.billable,
  );
  TestValidator.equals(
    "included timelog employee preserved",
    includedTimelog.employee.id,
    timelog.employee.id,
  );
  TestValidator.equals(
    "included timelog project preserved",
    includedTimelog.project.id,
    timelog.project.id,
  );
  TestValidator.equals(
    "included timelog task preserved",
    includedTimelog.task?.id ?? null,
    timelog.task?.id ?? null,
  );
  TestValidator.equals(
    "included timelog created_at preserved",
    includedTimelog.created_at,
    timelog.created_at,
  );
  TestValidator.equals(
    "included timelog updated_at preserved",
    includedTimelog.updated_at,
    timelog.updated_at,
  );
  TestValidator.equals(
    "included timelog remains active historical record",
    includedTimelog.deleted_at,
    null,
  );
}
