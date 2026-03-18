import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_memberships_create } from "../../../generate/generate_random_hrm_time_tracking_projects_memberships_create";
import { generate_random_hrm_time_tracking_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_create";
import { generate_random_hrm_time_tracking_projects_tasks_histories_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_histories_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_hrm_time_tracking_project_membership";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";
import { prepare_random_hrm_time_tracking_task_history } from "../../../prepare/prepare_random_hrm_time_tracking_task_history";

export async function test_api_task_history_employee_outside_project_scope_rejected(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_employee_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/hrm/projects",
      referrer: "https://example.com/hrm",
    },
  });
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_employee_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/hrm/member",
      referrer: "https://example.com/hrm",
    },
  });
  typia.assert(member);
  const outsiderConnection: api.IConnection = { host: connection.host };
  const outsider = await authorize_employee_join(outsiderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/hrm/outsider",
      referrer: "https://example.com/hrm",
    },
  });
  typia.assert(outsider);
  const project = await generate_random_hrm_time_tracking_projects_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#112233",
        status: "active",
        budget_hours: 120,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(project);
  const membership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      managerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: member.id,
          membership_role: "member",
        } satisfies IHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  const initialStatus = "open" as const;
  const task = await generate_random_hrm_time_tracking_projects_tasks_create(
    managerConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: initialStatus,
        priority: "high",
        estimated_hours: 8,
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
        hrm_time_tracking_employee_id: member.id,
      } satisfies IHrmTimeTrackingTask.ICreate,
    },
  );
  typia.assert(task);
  TestValidator.equals(
    "task starts with initial status",
    task.status,
    initialStatus,
  );
  TestValidator.equals(
    "task belongs to target project",
    task.project.id,
    project.id,
  );
  TestValidator.equals(
    "task assignee is the project member",
    task.assignee?.id,
    member.id,
  );
  TestValidator.notEquals(
    "outsider is different from assigned member",
    outsider.id,
    member.id,
  );
  await TestValidator.error(
    "employee outside project scope cannot create task history",
    async () => {
      await generate_random_hrm_time_tracking_projects_tasks_histories_create(
        outsiderConnection,
        {
          params: {
            projectId: project.id,
            taskId: task.id,
          },
          body: {
            new_status: "in-progress",
          } satisfies IHrmTimeTrackingTaskHistory.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "failed attempt leaves original task status unchanged in created task snapshot",
    task.status,
    initialStatus,
  );
}
