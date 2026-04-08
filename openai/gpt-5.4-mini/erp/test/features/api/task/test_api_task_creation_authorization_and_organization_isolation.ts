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

export async function test_api_task_creation_authorization_and_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Aa1234!@",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/erp/hrm-time/onboarding",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const localProject =
    await generate_random_erp_hrm_time_member_projects_create(
      memberConnection,
      {
        body: {
          name: `local-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#3366ff",
          status: "active",
          budgetHours: null,
          startDate: null,
          endDate: null,
        } satisfies IErpHrmTimeProject.ICreate,
      },
    );
  typia.assert(localProject);
  await TestValidator.httpError(
    "member without task management authority cannot create a task in the local project",
    [403, 404],
    async () => {
      await generate_random_erp_hrm_time_member_projects_tasks_create(
        memberConnection,
        {
          params: { projectId: localProject.id },
          body: {
            title: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            priority: "medium",
          } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
        },
      );
    },
  );
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Aa1234!@",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/erp/hrm-time/onboarding-2",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(otherMember);
  const otherOrganizationProject =
    await generate_random_erp_hrm_time_member_projects_create(
      otherMemberConnection,
      {
        body: {
          name: `remote-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#ff6633",
          status: "active",
          budgetHours: null,
          startDate: null,
          endDate: null,
        } satisfies IErpHrmTimeProject.ICreate,
      },
    );
  typia.assert(otherOrganizationProject);
  await TestValidator.httpError(
    "member cannot create a task in another organization's project",
    [403, 404],
    async () => {
      await generate_random_erp_hrm_time_member_projects_tasks_create(
        memberConnection,
        {
          params: { projectId: otherOrganizationProject.id },
          body: {
            title: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            priority: "high",
          } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
        },
      );
    },
  );
}
