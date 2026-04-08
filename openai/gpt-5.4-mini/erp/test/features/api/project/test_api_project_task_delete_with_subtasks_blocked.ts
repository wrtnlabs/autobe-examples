import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
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
import { prepare_random_erp_hrm_time_task_history_entry } from "../../../prepare/prepare_random_erp_hrm_time_task_history_entry";

export async function test_api_project_task_delete_with_subtasks_blocked(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const parentTask =
    await generate_random_erp_hrm_time_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "medium",
          status: "open",
        } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
      },
    );
  typia.assert(parentTask);
  const childTask =
    await generate_random_erp_hrm_time_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "low",
          status: "open",
          parentTaskId: parentTask.id,
        } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
      },
    );
  typia.assert(childTask);
  TestValidator.equals(
    "project is shared by parent task",
    parentTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "project is shared by child task",
    childTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "child keeps parent linkage",
    childTask.parentTask?.id,
    parentTask.id,
  );
  TestValidator.equals("parent has no parent", parentTask.parentTask, null);
  await TestValidator.httpError(
    "parent task deletion blocked while subtasks exist",
    [400, 409, 422],
    async () => {
      await api.functional.erpHrmTime.member.projects.tasks.erase(
        memberConnection,
        {
          projectId: project.id,
          taskId: parentTask.id,
        },
      );
    },
  );
  TestValidator.equals(
    "parent task remains intact after failed deletion",
    parentTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "child task remains intact after failed deletion",
    childTask.parentTask?.id,
    parentTask.id,
  );
}
