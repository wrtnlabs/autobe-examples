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

export async function test_api_timelog_delete_own_unlocked(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
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
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#33aa66",
        status: "active",
        budget_hours: 40,
        end_date: null,
      } satisfies Partial<IHrmTimeTrackingProject.ICreate>,
    },
  );
  typia.assert(project);
  const timelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          hrmTimeTrackingTaskId: null,
          workedOn: new Date().toISOString(),
          durationMinutes: 60,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        } satisfies Partial<IHrmTimeTrackingTimelog.ICreate>,
      },
    );
  typia.assert(timelog);
  TestValidator.equals(
    "employee owns timelog",
    timelog.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "timelog project matches",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "timelog organization matches project organization",
    timelog.organization.id,
    project.organization.id,
  );
  TestValidator.equals(
    "timelog is active before deletion",
    timelog.deleted_at,
    null,
  );
  await api.functional.hrmTimeTracking.employee.timelogs.erase(
    employeeConnection,
    {
      timelogId: timelog.id,
    },
  );
}
