import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_task_create_duplicate_sibling_or_nested_hierarchy_rejected(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = {
    host: connection.host,
  };
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(
      employeeConnection,
      {
        body: {
          name: `project-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.content({ paragraphs: 1 }),
          color_code: "#33AA55",
          status: "active",
          budget_hours: 120,
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 7,
          ).toISOString(),
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project);
  const parentTitle: string = `parent-${RandomGenerator.alphabets(6)}`;
  const duplicateChildTitle: string = `child-${RandomGenerator.alphabets(6)}`;
  const parentTask: IHrmTimeTrackingTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      employeeConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: parentTitle,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "open",
          priority: "medium",
          estimated_hours: 8,
          due_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          parent_id: null,
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(parentTask);
  const childTask: IHrmTimeTrackingTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      employeeConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: duplicateChildTitle,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "open",
          priority: "high",
          estimated_hours: 4,
          due_date: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
          parent_id: parentTask.id,
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(childTask);
  TestValidator.equals(
    "parent task belongs to created project",
    parentTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "parent task title matches input",
    parentTask.title,
    parentTitle,
  );
  TestValidator.equals("parent task has no parent", parentTask.parent, null);
  TestValidator.equals(
    "child task belongs to created project",
    childTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "child task title matches input",
    childTask.title,
    duplicateChildTitle,
  );
  TestValidator.equals(
    "child task parent id matches parent task",
    childTask.parent?.id ?? null,
    parentTask.id,
  );
  const preservedParentId: string = parentTask.id;
  const preservedParentTitle: string = parentTask.title;
  const preservedParentProjectId: string = parentTask.project.id;
  const preservedChildId: string = childTask.id;
  const preservedChildTitle: string = childTask.title;
  const preservedChildProjectId: string = childTask.project.id;
  const preservedChildParentId: string | null = childTask.parent?.id ?? null;
  await TestValidator.httpError(
    "duplicate sibling title under same parent is rejected",
    [400, 409, 422],
    async () => {
      await generate_random_hrm_time_tracking_projects_tasks_create(
        employeeConnection,
        {
          params: {
            projectId: project.id,
          },
          body: {
            title: duplicateChildTitle,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            status: "open",
            priority: "low",
            estimated_hours: 2,
            due_date: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
            parent_id: parentTask.id,
          } satisfies IHrmTimeTrackingTask.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "parent task id preserved after rejection",
    parentTask.id,
    preservedParentId,
  );
  TestValidator.equals(
    "parent task title preserved after rejection",
    parentTask.title,
    preservedParentTitle,
  );
  TestValidator.equals(
    "parent task project preserved after rejection",
    parentTask.project.id,
    preservedParentProjectId,
  );
  TestValidator.equals(
    "child task id preserved after rejection",
    childTask.id,
    preservedChildId,
  );
  TestValidator.equals(
    "child task title preserved after rejection",
    childTask.title,
    preservedChildTitle,
  );
  TestValidator.equals(
    "child task project preserved after rejection",
    childTask.project.id,
    preservedChildProjectId,
  );
  TestValidator.equals(
    "child task parent linkage preserved after rejection",
    childTask.parent?.id ?? null,
    preservedChildParentId,
  );
}
