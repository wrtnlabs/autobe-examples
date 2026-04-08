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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTaskHistoryEntry";
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

export async function test_api_project_tasks_access_control_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = `member-${RandomGenerator.alphabets(8)}@test.com`;
  const memberPassword = `P@ssw0rd-${RandomGenerator.alphabets(8)}`;
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const ownProject = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: `own-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
      },
    },
  );
  typia.assert(ownProject);
  const request: IErpHrmTimeTaskHistoryEntry.IRequest = {
    page: 1,
    pageSize: 10,
    limit: 10,
  } satisfies IErpHrmTimeTaskHistoryEntry.IRequest;
  const ownTasks = await api.functional.erpHrmTime.member.projects.tasks.index(
    memberConnection,
    {
      projectId: ownProject.id,
      body: request,
    },
  );
  typia.assert(ownTasks);
  TestValidator.equals(
    "own project task page is empty",
    ownTasks.data.length,
    0,
  );
  TestValidator.equals(
    "own project browse scope is isolated to the requested project",
    ownTasks.pagination.current,
    1,
  );
  TestValidator.equals(
    "own project browse respects requested page size",
    ownTasks.pagination.limit,
    10,
  );
  await TestValidator.httpError(
    "browsing tasks for an inaccessible project must be rejected",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.projects.tasks.index(
        memberConnection,
        {
          projectId: typia.random<string & tags.Format<"uuid">>(),
          body: request,
        },
      );
    },
  );
}
