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

export async function test_api_task_project_scope_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123!";
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const projectA = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 40,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(projectA);
  const projectB = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: `${projectA.name} other`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#ff6633",
        status: "active",
        budgetHours: 24,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(projectB);
  const task = await generate_random_erp_hrm_time_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: projectA.id },
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open",
        priority: "medium",
        estimatedHours: 4,
        dueDate: new Date().toISOString(),
      } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
    },
  );
  typia.assert(task);
  const matched = await api.functional.erpHrmTime.member.projects.tasks.at(
    memberConnection,
    {
      projectId: projectA.id,
      taskId: task.id,
    },
  );
  typia.assert(matched);
  TestValidator.equals(
    "task is returned from its own project",
    matched.id,
    task.id,
  );
  TestValidator.equals(
    "task project matches the lookup project",
    matched.project.id,
    projectA.id,
  );
  await TestValidator.httpError(
    "task must not be accessible through a different project path",
    [400, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.projects.tasks.at(
        memberConnection,
        {
          projectId: projectB.id,
          taskId: task.id,
        },
      );
    },
  );
}
