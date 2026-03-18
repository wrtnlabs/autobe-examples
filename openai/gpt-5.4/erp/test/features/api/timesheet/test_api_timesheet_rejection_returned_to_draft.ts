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

export async function test_api_timesheet_rejection_returned_to_draft(
  connection: api.IConnection,
): Promise<void> {
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuthorized = await authorize_manager_join(managerConnection, {
    body: {
      email: managerEmail,
      password: managerPassword,
      href,
      referrer,
      ip,
    } satisfies IHrmTimeTrackingManager.IJoin,
  });
  typia.assert(managerAuthorized);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuthorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href,
      referrer,
      ip,
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(employeeAuthorized);
  const managerLoginConnection: api.IConnection = { host: connection.host };
  const managerLoggedIn = await authorize_manager_login(
    managerLoginConnection,
    {
      body: {
        email: managerEmail,
        password: managerPassword,
        href,
        referrer,
        ip,
      } satisfies IHrmTimeTrackingManager.ILogin,
    },
  );
  typia.assert(managerLoggedIn);
  const employeeLoginConnection: api.IConnection = { host: connection.host };
  const employeeLoggedIn = await authorize_employee_login(
    employeeLoginConnection,
    {
      body: {
        email: employeeEmail,
        password: employeePassword,
        href,
        referrer,
        ip,
      } satisfies IHrmTimeTrackingEmployee.ILogin,
    },
  );
  typia.assert(employeeLoggedIn);
  const now = new Date();
  const utcDay = now.getUTCDay();
  const distanceFromMonday = (utcDay + 6) % 7;
  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - distanceFromMonday,
      0,
      0,
      0,
      0,
    ),
  );
  const weekStartDate = monday.toISOString();
  const created =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeLoginConnection,
      {
        body: {
          week_start_date: weekStartDate,
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "timesheet belongs to logged in employee",
    created.employee.id,
    employeeLoggedIn.id,
  );
  TestValidator.equals(
    "timesheet employee email matches logged in employee",
    created.employee.email,
    employeeLoggedIn.email,
  );
  TestValidator.equals("created timesheet is draft", created.status, "draft");
  TestValidator.equals(
    "submitted_at is initially null",
    created.submitted_at,
    null,
  );
  TestValidator.equals(
    "reviewed_at is initially null",
    created.reviewed_at,
    null,
  );
  const timelogIds = created.timelogs.map((timelog) => timelog.id);
  const timelogCount = created.timelogs.length;
  await TestValidator.error(
    "rejecting a draft timesheet is rejected",
    async () => {
      await api.functional.hrmTimeTracking.manager.timesheets.reject(
        managerLoginConnection,
        {
          timesheetId: created.id,
          body: {
            rejection_reason: null,
          } satisfies IHrmTimeTrackingTimesheet.IReject,
        },
      );
    },
  );
  TestValidator.equals(
    "snapshot status remains draft",
    created.status,
    "draft",
  );
  TestValidator.equals(
    "snapshot submitted_at remains null",
    created.submitted_at,
    null,
  );
  TestValidator.equals(
    "snapshot reviewed_at remains null",
    created.reviewed_at,
    null,
  );
  TestValidator.equals(
    "timelog composition count preserved in snapshot",
    created.timelogs.length,
    timelogCount,
  );
  TestValidator.equals(
    "timelog composition ids preserved in snapshot",
    created.timelogs.map((timelog) => timelog.id),
    timelogIds,
  );
}
