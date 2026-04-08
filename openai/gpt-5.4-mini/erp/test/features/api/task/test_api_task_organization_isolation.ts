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
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";

export async function test_api_task_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const sourceJoinConnection: api.IConnection = { host: connection.host };
  const sourceAuth = await authorize_member_join(sourceJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/source-signup",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(sourceAuth);
  const sourceConnection: api.IConnection = { host: connection.host };
  sourceConnection.headers = {
    Authorization: `Bearer ${sourceAuth.token.access}`,
  };
  const sourceProject = await api.functional.erpHrmTime.member.projects.create(
    sourceConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 120,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(sourceProject);
  const otherJoinConnection: api.IConnection = { host: connection.host };
  const otherAuth = await authorize_member_join(otherJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/other-signup",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(otherAuth);
  const otherConnection: api.IConnection = { host: connection.host };
  otherConnection.headers = {
    Authorization: `Bearer ${otherAuth.token.access}`,
  };
  const inaccessibleTaskId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cross-organization task access should fail",
    async () => {
      await api.functional.erpHrmTime.member.projects.tasks.at(
        otherConnection,
        {
          projectId: sourceProject.id,
          taskId: inaccessibleTaskId,
        },
      );
    },
  );
}
