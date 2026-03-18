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

export async function test_api_task_deletion_child_task_exists(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
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
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        status: "active",
        budget_hours: 40,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      },
    },
  );
  typia.assert(project);
  const parentTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      ownerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          status: "open",
          priority: "high",
          estimated_hours: 8,
          due_date: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 7,
          ).toISOString(),
          parent_id: null,
        },
      },
    );
  typia.assert(parentTask);
  const childTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      ownerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          status: "open",
          priority: "medium",
          estimated_hours: 4,
          due_date: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 3,
          ).toISOString(),
          parent_id: parentTask.id,
        },
      },
    );
  typia.assert(childTask);
  await TestValidator.error(
    "deletion blocked when child tasks still exist",
    async () => {
      await api.functional.hrmTimeTracking.projects.tasks.erase(
        ownerConnection,
        {
          projectId: project.id,
          taskId: parentTask.id,
        },
      );
    },
  );
  TestValidator.notEquals(
    "parent and child task ids differ",
    parentTask.id,
    childTask.id,
  );
  TestValidator.equals(
    "parent task project preserved",
    parentTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "parent task remains active in created snapshot",
    parentTask.deleted_at,
    null,
  );
  TestValidator.equals(
    "child task project preserved",
    childTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "child task parent preserved",
    childTask.parent?.id ?? null,
    parentTask.id,
  );
  TestValidator.equals(
    "child task parent title preserved",
    childTask.parent?.title ?? null,
    parentTask.title,
  );
  TestValidator.equals(
    "child task remains active in created snapshot",
    childTask.deleted_at,
    null,
  );
}
