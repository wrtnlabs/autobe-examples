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

export async function test_api_project_task_delete_out_of_scope_blocked(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `Pw-${RandomGenerator.alphaNumeric(16)}!`,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const primaryProject =
    await generate_random_erp_hrm_time_member_projects_create(
      memberConnection,
      {
        body: {
          name: `primary-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#3366ff",
          status: "active",
          budgetHours: 40,
        },
      },
    );
  typia.assert(primaryProject);
  const secondaryProject =
    await generate_random_erp_hrm_time_member_projects_create(
      memberConnection,
      {
        body: {
          name: `secondary-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#ff6633",
          status: "active",
          budgetHours: 20,
        },
      },
    );
  typia.assert(secondaryProject);
  const task = await generate_random_erp_hrm_time_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: primaryProject.id,
      },
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
        status: "open",
        estimatedHours: 4,
      },
    },
  );
  typia.assert(task);
  await TestValidator.error(
    "delete task with mismatched project scope should fail",
    async () => {
      await api.functional.erpHrmTime.member.projects.tasks.erase(
        memberConnection,
        {
          projectId: secondaryProject.id,
          taskId: task.id,
        },
      );
    },
  );
  await api.functional.erpHrmTime.member.projects.tasks.erase(
    memberConnection,
    {
      projectId: primaryProject.id,
      taskId: task.id,
    },
  );
}
