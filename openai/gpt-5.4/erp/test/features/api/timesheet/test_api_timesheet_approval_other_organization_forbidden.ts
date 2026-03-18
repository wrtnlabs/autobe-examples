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
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_approval_other_organization_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = "EmployeePass1234!";
  const employeeHref = typia.random<string & tags.Format<"uri">>();
  const employeeReferrer = typia.random<string & tags.Format<"uri">>();
  const employeeIp = typia.random<string & tags.Format<"ipv4">>();
  const employeeJoinConnection: api.IConnection = { host: connection.host };
  const joinedEmployee = await authorize_employee_join(employeeJoinConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: employeeHref,
      referrer: employeeReferrer,
      ip: employeeIp,
    },
  });
  typia.assert(joinedEmployee);
  TestValidator.equals(
    "joined employee email",
    joinedEmployee.email,
    employeeEmail,
  );
  const employeeConnection: api.IConnection = { host: connection.host };
  const loggedInEmployee = await authorize_employee_login(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.ILogin,
  });
  typia.assert(loggedInEmployee);
  TestValidator.equals(
    "logged in employee email",
    loggedInEmployee.email,
    employeeEmail,
  );
  const createdTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: undefined,
      },
    );
  typia.assert(createdTimesheet);
  TestValidator.equals(
    "created timesheet owner",
    createdTimesheet.employee.id,
    loggedInEmployee.id,
  );
  TestValidator.equals(
    "created timesheet status",
    createdTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "created timesheet reviewed_at empty",
    createdTimesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "created timesheet submitted_at empty",
    createdTimesheet.submitted_at,
    null,
  );
  const createdTimelogSnapshot = createdTimesheet.timelogs.map((timelog) => ({
    id: timelog.id,
    organizationId: timelog.organization.id,
    employeeId: timelog.employee.id,
    projectId: timelog.project.id,
    taskId: timelog.task?.id ?? null,
    worked_on: timelog.worked_on,
    duration_minutes: timelog.duration_minutes,
    description: timelog.description,
    billable: timelog.billable,
  }));
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.employee.timesheets.submit(
      employeeConnection,
      {
        timesheetId: createdTimesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "submitted timesheet id",
    submittedTimesheet.id,
    createdTimesheet.id,
  );
  TestValidator.equals(
    "submitted timesheet organization",
    submittedTimesheet.organization.id,
    createdTimesheet.organization.id,
  );
  TestValidator.equals(
    "submitted timesheet employee",
    submittedTimesheet.employee.id,
    createdTimesheet.employee.id,
  );
  TestValidator.equals(
    "submitted status",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.notEquals(
    "submitted_at recorded",
    submittedTimesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "reviewed_at still empty after submit",
    submittedTimesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason remains null after submit",
    submittedTimesheet.rejection_reason,
    null,
  );
  TestValidator.equals(
    "submitted timelog count unchanged",
    submittedTimesheet.timelogs.length,
    createdTimesheet.timelogs.length,
  );
  TestValidator.equals(
    "submitted total hours unchanged",
    submittedTimesheet.total_hours,
    createdTimesheet.total_hours,
  );
  const submittedTimelogSnapshot = submittedTimesheet.timelogs.map(
    (timelog) => ({
      id: timelog.id,
      organizationId: timelog.organization.id,
      employeeId: timelog.employee.id,
      projectId: timelog.project.id,
      taskId: timelog.task?.id ?? null,
      worked_on: timelog.worked_on,
      duration_minutes: timelog.duration_minutes,
      description: timelog.description,
      billable: timelog.billable,
    }),
  );
  TestValidator.equals(
    "timelogs preserved on submit",
    submittedTimelogSnapshot,
    createdTimelogSnapshot,
  );
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = "ManagerPass1234!";
  const managerJoinConnection: api.IConnection = { host: connection.host };
  const joinedManager = await authorize_manager_join(managerJoinConnection, {
    body: {
      email: managerEmail,
      password: managerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinedManager);
  TestValidator.equals(
    "joined manager email",
    joinedManager.email,
    managerEmail,
  );
  const foreignManagerConnection: api.IConnection = { host: connection.host };
  const loggedInManager = await authorize_manager_login(
    foreignManagerConnection,
    {
      body: {
        email: managerEmail,
        password: managerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmTimeTrackingManager.ILogin,
    },
  );
  typia.assert(loggedInManager);
  TestValidator.equals(
    "logged in manager email",
    loggedInManager.email,
    managerEmail,
  );
  await TestValidator.httpError(
    "foreign organization manager cannot approve submitted timesheet",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.manager.timesheets.approve(
        foreignManagerConnection,
        {
          timesheetId: submittedTimesheet.id,
        },
      );
    },
  );
  TestValidator.equals(
    "submitted timesheet status remains submitted in observable snapshot",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.notEquals(
    "submitted snapshot still has submitted_at",
    submittedTimesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "submitted snapshot still has no reviewed_at",
    submittedTimesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "submitted snapshot still has null rejection_reason",
    submittedTimesheet.rejection_reason,
    null,
  );
  TestValidator.equals(
    "submitted snapshot total hours unchanged after denied approval",
    submittedTimesheet.total_hours,
    createdTimesheet.total_hours,
  );
  TestValidator.equals(
    "submitted snapshot timelogs unchanged after denied approval",
    submittedTimesheet.timelogs.map((timelog) => ({
      id: timelog.id,
      organizationId: timelog.organization.id,
      employeeId: timelog.employee.id,
      projectId: timelog.project.id,
      taskId: timelog.task?.id ?? null,
      worked_on: timelog.worked_on,
      duration_minutes: timelog.duration_minutes,
      description: timelog.description,
      billable: timelog.billable,
    })),
    submittedTimelogSnapshot,
  );
}
