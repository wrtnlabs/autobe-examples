import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_create";
import { generate_random_hrm_time_tracking_projects_tasks_histories_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_histories_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";
import { prepare_random_hrm_time_tracking_task_history } from "../../../prepare/prepare_random_hrm_time_tracking_task_history";

export async function test_api_task_history_create_status_transition_by_authorized_manager(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const project = await generate_random_hrm_time_tracking_projects_create(
    managerConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#33AA55",
        status: "active",
        budget_hours: 120,
      },
    },
  );
  typia.assert(project);
  const task = await generate_random_hrm_time_tracking_projects_tasks_create(
    managerConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: `task-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "high",
        estimated_hours: 8,
      },
    },
  );
  typia.assert(task);
  const firstHistory =
    await generate_random_hrm_time_tracking_projects_tasks_histories_create(
      managerConnection,
      {
        params: {
          projectId: project.id,
          taskId: task.id,
        },
        body: {
          new_status: "in-progress",
        },
      },
    );
  typia.assert(firstHistory);
  TestValidator.equals(
    "first history references created task",
    firstHistory.task.id,
    task.id,
  );
  TestValidator.equals(
    "first history old status is original task status",
    firstHistory.old_status,
    task.status,
  );
  TestValidator.equals(
    "first history new status matches request",
    firstHistory.new_status,
    "in-progress",
  );
  TestValidator.notEquals(
    "first history actor type is populated",
    firstHistory.actor_type,
    "",
  );
  TestValidator.equals(
    "first history is active",
    firstHistory.deleted_at,
    null,
  );
  TestValidator.equals(
    "embedded task summary status synchronized after first transition",
    firstHistory.task.status,
    "in-progress",
  );
  TestValidator.predicate(
    "changed_at populated",
    firstHistory.changed_at.length > 0,
  );
  TestValidator.predicate(
    "created_at populated",
    firstHistory.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at populated",
    firstHistory.updated_at.length > 0,
  );
  const secondHistory =
    await generate_random_hrm_time_tracking_projects_tasks_histories_create(
      managerConnection,
      {
        params: {
          projectId: project.id,
          taskId: task.id,
        },
        body: {
          new_status: "completed",
        },
      },
    );
  typia.assert(secondHistory);
  TestValidator.notEquals(
    "append-only audit creates a distinct history entry",
    firstHistory.id,
    secondHistory.id,
  );
  TestValidator.equals(
    "second history references same task",
    secondHistory.task.id,
    task.id,
  );
  TestValidator.equals(
    "second history still references first history task",
    secondHistory.task.id,
    firstHistory.task.id,
  );
  TestValidator.equals(
    "second history old status follows prior transition",
    secondHistory.old_status,
    "in-progress",
  );
  TestValidator.equals(
    "second history new status matches request",
    secondHistory.new_status,
    "completed",
  );
  TestValidator.equals(
    "second history task summary synchronized",
    secondHistory.task.status,
    "completed",
  );
  TestValidator.equals(
    "second history remains active",
    secondHistory.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "second history actor type is populated",
    secondHistory.actor_type,
    "",
  );
}
