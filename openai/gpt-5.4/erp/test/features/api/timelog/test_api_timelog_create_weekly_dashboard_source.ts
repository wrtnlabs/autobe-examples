import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_employee_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timelogs_create";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";

export async function test_api_timelog_create_weekly_dashboard_source(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const project = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(project);
  const now = new Date();
  const utcDay = now.getUTCDay();
  const distanceFromMonday = utcDay === 0 ? 6 : utcDay - 1;
  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - distanceFromMonday,
      9,
      0,
      0,
      0,
    ),
  );
  const workedOn = new Date(
    monday.getTime() + 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const durationMinutes = 90;
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const billable = true;
  const timelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          hrmTimeTrackingTaskId: null,
          workedOn,
          durationMinutes,
          description,
          billable,
        } satisfies IHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(timelog);
  TestValidator.equals(
    "employee id matches authorized employee",
    timelog.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "employee email matches authorized employee",
    timelog.employee.email,
    authorized.email,
  );
  TestValidator.equals(
    "project id matches created project",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "project organization matches created project organization",
    timelog.project.organization.id,
    project.organization.id,
  );
  TestValidator.equals(
    "timelog organization matches project organization",
    timelog.organization.id,
    project.organization.id,
  );
  TestValidator.equals(
    "worked_on is preserved exactly",
    timelog.worked_on,
    workedOn,
  );
  TestValidator.equals(
    "duration_minutes is preserved exactly",
    timelog.duration_minutes,
    durationMinutes,
  );
  TestValidator.equals(
    "description is preserved exactly",
    timelog.description,
    description,
  );
  TestValidator.equals(
    "billable flag is preserved exactly",
    timelog.billable,
    billable,
  );
  TestValidator.equals(
    "task is absent for standalone project-level timelog",
    timelog.task,
    null,
  );
  TestValidator.equals(
    "new timelog is active and not soft deleted",
    timelog.deleted_at,
    null,
  );
}
