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

export async function test_api_timelog_create_employee_project_entry(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://example.com/hrm/join",
    referrer: "https://example.com/hrm",
    ip: "127.0.0.1",
  } satisfies IHrmTimeTrackingEmployee.IJoin;
  const authorized = await authorize_employee_join(employeeConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const project = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: `Project ${RandomGenerator.alphabets(8)}`,
        description: null,
        color_code: "#3366ff",
        status: "active",
        budget_hours: null,
        start_date: null,
        end_date: null,
      },
    },
  );
  typia.assert(project);
  const workedOn = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
  const durationMinutes = 90;
  const billable = true;
  const timelogBody = {
    hrmTimeTrackingProjectId: project.id,
    hrmTimeTrackingTaskId: null,
    workedOn,
    durationMinutes,
    description: null,
    billable,
  } satisfies IHrmTimeTrackingTimelog.ICreate;
  const timelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: timelogBody,
      },
    );
  typia.assert(timelog);
  TestValidator.notEquals(
    "timelog id differs from project id",
    timelog.id,
    project.id,
  );
  TestValidator.equals(
    "timelog organization matches project organization",
    timelog.organization.id,
    project.organization.id,
  );
  TestValidator.equals(
    "timelog organization matches authorized role organization",
    timelog.organization.id,
    authorized.role.organization.id,
  );
  TestValidator.equals(
    "timelog employee id matches actor",
    timelog.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "timelog employee email matches actor",
    timelog.employee.email,
    authorized.email,
  );
  TestValidator.equals(
    "timelog project id matches",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "timelog project name matches",
    timelog.project.name,
    project.name,
  );
  TestValidator.equals(
    "timelog project status matches",
    timelog.project.status,
    project.status,
  );
  TestValidator.equals(
    "timelog project organization matches",
    timelog.project.organization.id,
    project.organization.id,
  );
  TestValidator.equals("task omitted returns null", timelog.task, null);
  TestValidator.equals("worked_on persists", timelog.worked_on, workedOn);
  TestValidator.equals(
    "duration_minutes persists",
    timelog.duration_minutes,
    durationMinutes,
  );
  TestValidator.equals(
    "description persists as null",
    timelog.description,
    null,
  );
  TestValidator.equals("billable persists", timelog.billable, billable);
  TestValidator.equals("deleted_at is null", timelog.deleted_at, null);
  TestValidator.predicate(
    "created_at exists",
    timelog.created_at !== null && timelog.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    timelog.updated_at !== null && timelog.updated_at !== undefined,
  );
}
