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

export async function test_api_timelog_detail_employee_forbidden_other_record(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_employee_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(owner);
  const otherConnection: api.IConnection = { host: connection.host };
  const other = await authorize_employee_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(other);
  const hexLetters = ["a", "b", "c", "d", "e", "f"] as const;
  const colorCode = `#${ArrayUtil.repeat(6, () => RandomGenerator.pick(hexLetters)).join("")}`;
  const project = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: colorCode,
        status: "active",
        budget_hours: 40,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(project);
  const timelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      ownerConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          hrmTimeTrackingTaskId: null,
          workedOn: new Date().toISOString(),
          durationMinutes: 60,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        } satisfies IHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(timelog);
  TestValidator.equals(
    "timelog owner matches creator",
    timelog.employee.id,
    owner.id,
  );
  TestValidator.equals(
    "timelog project matches created project",
    timelog.project.id,
    project.id,
  );
  await TestValidator.httpError(
    "other employee cannot read someone else's timelog",
    403,
    async () => {
      await api.functional.hrmTimeTracking.employee.timelogs.at(
        otherConnection,
        {
          timelogId: timelog.id,
        },
      );
    },
  );
}
