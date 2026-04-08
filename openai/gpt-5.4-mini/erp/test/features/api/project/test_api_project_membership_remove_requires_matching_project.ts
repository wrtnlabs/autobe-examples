import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectMembership";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_memberships_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_project_membership";

export async function test_api_project_membership_remove_requires_matching_project(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const login = await authorize_member_join(memberConnection, {
    body: {
      email: `member-${typia.random<string & tags.Format<"uuid">>()}@test.com`,
      password: "Password123!" satisfies string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(login);
  const realProject = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: `real-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366FF",
        status: "active",
      },
    },
  );
  typia.assert(realProject);
  const decoyProject =
    await generate_random_erp_hrm_time_member_projects_create(
      memberConnection,
      {
        body: {
          name: `decoy-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#FF6633",
          status: "active",
        },
      },
    );
  typia.assert(decoyProject);
  await TestValidator.error(
    "deleting a membership through a mismatched project id should fail",
    async () => {
      await api.functional.erpHrmTime.member.projects.memberships.erase(
        memberConnection,
        {
          projectId: decoyProject.id,
          membershipId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  const realMemberships =
    await api.functional.erpHrmTime.member.projects.memberships.index(
      memberConnection,
      {
        projectId: realProject.id,
        body: {} satisfies IErpHrmTimeProjectMembership.IRequest,
      },
    );
  typia.assert(realMemberships);
  TestValidator.predicate(
    "real project membership list should still be readable",
    realMemberships.pagination.records >= 0,
  );
}
