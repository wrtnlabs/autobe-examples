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
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";

export async function test_api_project_membership_list_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com`,
      password: `${RandomGenerator.alphaNumeric(12)}Aa1!`,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}-b@test.com`,
      password: `${RandomGenerator.alphaNumeric(12)}Bb1!`,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const projectA = await generate_random_erp_hrm_time_member_projects_create(
    memberAConnection,
    {
      body: {
        name: `project-a-${RandomGenerator.alphaNumeric(8)}`,
        colorCode: "#3366ff",
        status: "active",
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(projectA);
  const projectB = await generate_random_erp_hrm_time_member_projects_create(
    memberBConnection,
    {
      body: {
        name: `project-b-${RandomGenerator.alphaNumeric(8)}`,
        colorCode: "#ff6633",
        status: "active",
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(projectB);
  const allowed =
    await api.functional.erpHrmTime.member.projects.memberships.index(
      memberAConnection,
      {
        projectId: projectA.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeProjectMembership.IRequest,
      },
    );
  typia.assert(allowed);
  TestValidator.equals(
    "allowed membership list starts at first page",
    allowed.pagination.current,
    1,
  );
  TestValidator.predicate(
    "allowed membership list is scoped to current project",
    allowed.data.every((item) => item.project.id === projectA.id),
  );
  await TestValidator.httpError(
    "cross-organization memberships request should be rejected",
    [403, 404],
    async () => {
      await api.functional.erpHrmTime.member.projects.memberships.index(
        memberAConnection,
        {
          projectId: projectB.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IErpHrmTimeProjectMembership.IRequest,
        },
      );
    },
  );
  await TestValidator.httpError(
    "missing project in active organization should return not found",
    404,
    async () => {
      await api.functional.erpHrmTime.member.projects.memberships.index(
        memberAConnection,
        {
          projectId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
          } satisfies IErpHrmTimeProjectMembership.IRequest,
        },
      );
    },
  );
}
