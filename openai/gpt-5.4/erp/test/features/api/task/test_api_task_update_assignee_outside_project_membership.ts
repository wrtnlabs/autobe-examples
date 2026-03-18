import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_task_update_assignee_outside_project_membership(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  const project = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        status: "active",
        budget_hours: 40,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(project);
  const createdTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      ownerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          status: "open",
          priority: "high",
          estimated_hours: 8,
          due_date: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
          hrm_time_tracking_employee_id: null,
          parent_id: null,
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(createdTask);
  const invalidEmployeeId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    title: `${createdTask.title} reassignment-attempt`,
    status: "completed",
    priority: "urgent",
    estimated_hours: 13,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
    hrm_time_tracking_employee_id: invalidEmployeeId,
    parent_id: createdTask.parent?.id ?? null,
    description: createdTask.description,
  } satisfies IHrmTimeTrackingTask.IUpdate;
  await TestValidator.httpError(
    "reject update when assignee is outside project membership",
    [400, 403, 404, 409, 422],
    async () => {
      await api.functional.hrmTimeTracking.projects.tasks.update(
        ownerConnection,
        {
          projectId: project.id,
          taskId: createdTask.id,
          body: updateBody,
        },
      );
    },
  );
}
