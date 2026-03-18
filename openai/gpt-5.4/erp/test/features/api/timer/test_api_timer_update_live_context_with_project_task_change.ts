import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_employee_timers_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timers_create";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";
import { prepare_random_hrm_time_tracking_timer } from "../../../prepare/prepare_random_hrm_time_tracking_timer";

export async function test_api_timer_update_live_context_with_project_task_change(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const initialProject =
    await generate_random_hrm_time_tracking_projects_create(
      employeeConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#aa11cc",
          status: "active",
          budget_hours: 40,
          start_date: new Date().toISOString(),
          end_date: null,
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(initialProject);
  const originalDescription = RandomGenerator.paragraph({ sentences: 3 });
  const timer = await generate_random_hrm_time_tracking_employee_timers_create(
    employeeConnection,
    {
      body: {
        hrm_time_tracking_project_id: initialProject.id,
        hrm_time_tracking_task_id: null,
        description: originalDescription,
      } satisfies IHrmTimeTrackingTimer.ICreate,
    },
  );
  typia.assert(timer);
  const switchedProject =
    await generate_random_hrm_time_tracking_projects_create(
      employeeConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#11aaff",
          status: "active",
          budget_hours: 80,
          start_date: new Date().toISOString(),
          end_date: null,
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(switchedProject);
  const switchedTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      employeeConnection,
      {
        params: {
          projectId: switchedProject.id,
        },
        body: {
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "open",
          priority: "high",
          estimated_hours: 4,
          due_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          hrm_time_tracking_employee_id: null,
          parent_id: null,
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(switchedTask);
  const nextDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updated = await api.functional.hrmTimeTracking.employee.timers.update(
    employeeConnection,
    {
      timerId: timer.id,
      body: {
        project_id: switchedProject.id,
        task_id: switchedTask.id,
        description: nextDescription,
      } satisfies IHrmTimeTrackingTimer.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("timer identity preserved", updated.id, timer.id);
  TestValidator.equals(
    "timer start time preserved",
    updated.started_at,
    timer.started_at,
  );
  TestValidator.equals(
    "timer switched to second project",
    updated.project.id,
    switchedProject.id,
  );
  TestValidator.equals(
    "timer owner preserved",
    updated.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "updated description applied",
    updated.description,
    nextDescription,
  );
  TestValidator.notEquals(
    "updated_at changes after live context update",
    updated.updated_at,
    timer.updated_at,
  );
  TestValidator.equals("timer remains active", updated.deleted_at, null);
  TestValidator.predicate(
    "task is assigned after update",
    updated.task !== null,
  );
  if (updated.task !== null) {
    TestValidator.equals(
      "timer switched to created task",
      updated.task.id,
      switchedTask.id,
    );
  }
}
