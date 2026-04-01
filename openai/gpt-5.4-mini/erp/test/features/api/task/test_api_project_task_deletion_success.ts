import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_tasks_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_task } from "../../../prepare/prepare_random_erp_hrm_time_task";

export async function test_api_project_task_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/erp-hrm-time/join",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    },
  });
  typia.assert(member);
  const projectConnection: api.IConnection = { host: connection.host };
  projectConnection.headers = {
    Authorization: `Bearer ${member.token.access}`,
  };
  const project = await generate_random_erp_hrm_time_member_projects_create(
    projectConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: null,
        startDate: null,
        endDate: null,
      },
    },
  );
  typia.assert(project);
  const targetTask =
    await generate_random_erp_hrm_time_member_projects_tasks_create(
      projectConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "medium",
          estimatedHours: 3,
          dueDate: null,
          employeeId: null,
          parentTaskId: null,
        },
      },
    );
  typia.assert(targetTask);
  const siblingTask =
    await generate_random_erp_hrm_time_member_projects_tasks_create(
      projectConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "high",
          estimatedHours: 5,
          dueDate: null,
          employeeId: null,
          parentTaskId: null,
        },
      },
    );
  typia.assert(siblingTask);
  await api.functional.erpHrmTime.member.projects.tasks.erase(
    projectConnection,
    {
      projectId: project.id,
      taskId: targetTask.id,
    },
  );
  TestValidator.notEquals(
    "deleted task must be distinct from remaining task",
    targetTask.id,
    siblingTask.id,
  );
  TestValidator.equals(
    "remaining task should still belong to the same project",
    siblingTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "remaining task title should stay unchanged after deleting another task",
    siblingTask.title,
    siblingTask.title,
  );
}
