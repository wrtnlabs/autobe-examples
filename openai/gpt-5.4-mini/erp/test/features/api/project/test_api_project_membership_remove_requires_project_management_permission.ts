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

export async function test_api_project_membership_remove_requires_project_management_permission(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  const unauthorizedAuthorized = await authorize_member_join(
    unauthorizedConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
        displayName: RandomGenerator.name(),
        href: "https://example.com/onboarding",
        referrer: "https://example.com",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(unauthorizedAuthorized);
  const project = await generate_random_erp_hrm_time_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        colorCode: "#3366ff",
        status: "active",
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  await TestValidator.error(
    "member without project management permission cannot remove project membership",
    async () => {
      await api.functional.erpHrmTime.member.projects.memberships.erase(
        unauthorizedConnection,
        {
          projectId: project.id,
          membershipId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  const membershipList =
    await api.functional.erpHrmTime.member.projects.memberships.index(
      ownerConnection,
      {
        projectId: project.id,
        body: {} satisfies IErpHrmTimeProjectMembership.IRequest,
      },
    );
  typia.assert(membershipList);
  TestValidator.equals(
    "no membership should be removed by unauthorized attempt",
    membershipList.data.length,
    membershipList.data.length,
  );
}
