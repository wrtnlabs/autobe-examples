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

export async function test_api_timer_update_rejects_task_from_different_project(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingEmployee.IAuthorized =
    await authorize_employee_join(employeeConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies Partial<IHrmTimeTrackingEmployee.IJoin>,
    });
  typia.assert(authorized);
  const originalProject: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(
      employeeConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#3366ff",
          status: "active",
        } satisfies Partial<IHrmTimeTrackingProject.ICreate>,
      },
    );
  typia.assert(originalProject);
  const originalDescription = RandomGenerator.paragraph({ sentences: 3 });
  const runningTimer: IHrmTimeTrackingTimer =
    await generate_random_hrm_time_tracking_employee_timers_create(
      employeeConnection,
      {
        body: {
          hrm_time_tracking_project_id: originalProject.id,
          hrm_time_tracking_task_id: null,
          description: originalDescription,
        } satisfies Partial<IHrmTimeTrackingTimer.ICreate>,
      },
    );
  typia.assert(runningTimer);
  const foreignProject: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(
      employeeConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#ff6633",
          status: "active",
        } satisfies Partial<IHrmTimeTrackingProject.ICreate>,
      },
    );
  typia.assert(foreignProject);
  const foreignTask: IHrmTimeTrackingTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      employeeConnection,
      {
        params: {
          projectId: foreignProject.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "open",
          priority: "high",
        } satisfies Partial<IHrmTimeTrackingTask.ICreate>,
      },
    );
  typia.assert(foreignTask);
  await TestValidator.error(
    "rejects timer update with task from different project",
    async () => {
      await api.functional.hrmTimeTracking.employee.timers.update(
        employeeConnection,
        {
          timerId: runningTimer.id,
          body: {
            project_id: originalProject.id,
            task_id: foreignTask.id,
          } satisfies IHrmTimeTrackingTimer.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "still has only one active running timer after rejected update",
    async () => {
      await generate_random_hrm_time_tracking_employee_timers_create(
        employeeConnection,
        {
          body: {
            hrm_time_tracking_project_id: originalProject.id,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies Partial<IHrmTimeTrackingTimer.ICreate>,
        },
      );
    },
  );
  const recovered: IHrmTimeTrackingTimer =
    await api.functional.hrmTimeTracking.employee.timers.update(
      employeeConnection,
      {
        timerId: runningTimer.id,
        body: {
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IHrmTimeTrackingTimer.IUpdate,
      },
    );
  typia.assert(recovered);
  TestValidator.equals(
    "timer identity unchanged after failed update",
    recovered.id,
    runningTimer.id,
  );
  TestValidator.equals(
    "timer still belongs to original project",
    recovered.project.id,
    originalProject.id,
  );
  TestValidator.equals(
    "timer task remains unchanged",
    recovered.task,
    runningTimer.task,
  );
  TestValidator.equals(
    "timer started_at preserved",
    recovered.started_at,
    runningTimer.started_at,
  );
  TestValidator.notEquals(
    "successful later update changes description",
    recovered.description,
    runningTimer.description,
  );
}
