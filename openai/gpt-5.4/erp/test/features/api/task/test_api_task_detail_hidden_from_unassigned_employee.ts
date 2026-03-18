import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_task_detail_hidden_from_unassigned_employee(
  connection: api.IConnection,
): Promise<void> {
  const creatorConnection: api.IConnection = {
    host: connection.host,
  };
  const creator = await authorize_employee_join(creatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(creator);
  const outsiderConnection: api.IConnection = {
    host: connection.host,
  };
  const outsider = await authorize_employee_join(outsiderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(outsider);
  const project = await generate_random_hrm_time_tracking_projects_create(
    creatorConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: `#${RandomGenerator.alphabets(6)}`,
        status: "active",
        budget_hours: 40,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(project);
  const task = await generate_random_hrm_time_tracking_projects_tasks_create(
    creatorConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: "open",
        priority: "medium",
        estimated_hours: 8,
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        hrm_time_tracking_employee_id: null,
        parent_id: null,
      } satisfies IHrmTimeTrackingTask.ICreate,
    },
  );
  typia.assert(task);
  await TestValidator.httpError(
    "task detail should be hidden from unassigned outsider employee",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.projects.tasks.at(
        outsiderConnection,
        {
          projectId: project.id,
          taskId: task.id,
        },
      );
    },
  );
}
