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

export async function test_api_timelog_detail_employee_own_record(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const projectBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    color_code: "#11aa22",
    status: "active",
    budget_hours: 40,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  } satisfies IHrmTimeTrackingProject.ICreate;
  const project = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: projectBody,
    },
  );
  typia.assert(project);
  const workedOn = new Date(Date.now() - 1000 * 60 * 60).toISOString();
  const durationMinutes = 90 satisfies number as number;
  const description = RandomGenerator.paragraph({ sentences: 4 });
  const timelogBody = {
    hrmTimeTrackingProjectId: project.id,
    workedOn,
    durationMinutes,
    description,
    billable: true,
  } satisfies IHrmTimeTrackingTimelog.ICreate;
  const created =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: timelogBody,
      },
    );
  typia.assert(created);
  const detail = await api.functional.hrmTimeTracking.employee.timelogs.at(
    employeeConnection,
    {
      timelogId: created.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("same timelog id", detail.id, created.id);
  TestValidator.equals("same worked_on", detail.worked_on, created.worked_on);
  TestValidator.equals(
    "same duration_minutes",
    detail.duration_minutes,
    created.duration_minutes,
  );
  TestValidator.equals("same billable", detail.billable, created.billable);
  TestValidator.equals(
    "same description",
    detail.description,
    created.description,
  );
  TestValidator.equals(
    "same organization id",
    detail.organization.id,
    created.organization.id,
  );
  TestValidator.equals(
    "same organization name",
    detail.organization.name,
    created.organization.name,
  );
  TestValidator.equals(
    "same employee id",
    detail.employee.id,
    created.employee.id,
  );
  TestValidator.equals(
    "same employee email",
    detail.employee.email,
    created.employee.email,
  );
  TestValidator.equals(
    "same project id from detail and create response",
    detail.project.id,
    created.project.id,
  );
  TestValidator.equals(
    "same project id as created project",
    detail.project.id,
    project.id,
  );
  TestValidator.equals(
    "same project name",
    detail.project.name,
    created.project.name,
  );
  TestValidator.equals(
    "same project description",
    detail.project.description,
    created.project.description,
  );
  TestValidator.equals("task is null", detail.task, null);
}
