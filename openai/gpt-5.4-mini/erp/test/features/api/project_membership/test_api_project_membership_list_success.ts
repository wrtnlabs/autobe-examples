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

export async function test_api_project_membership_list_success(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const actor = await authorize_member_join(actorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(actor);
  const project = await generate_random_erp_hrm_time_member_projects_create(
    actorConnection,
    {
      body: {
        name: `Project ${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366FF",
        status: "active",
        budgetHours: 120,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const page =
    await api.functional.erpHrmTime.member.projects.memberships.index(
      actorConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IErpHrmTimeProjectMembership.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals("page current", page.pagination.current, 1);
  TestValidator.equals("page limit", page.pagination.limit, 1);
  TestValidator.predicate(
    "pagination records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data size within limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "all memberships scoped to the requested project",
    page.data.every((item) => item.project.id === project.id),
  );
  TestValidator.predicate(
    "all memberships reference the same organization",
    page.data.every(
      (item) => item.project.organization.id === project.organization.id,
    ),
  );
  TestValidator.predicate(
    "memberships contain summaries and project roles",
    page.data.every(
      (item) =>
        typeof item.id === "string" &&
        typeof item.projectRole === "string" &&
        typeof item.employee.id === "string" &&
        typeof item.project.id === "string",
    ),
  );
  TestValidator.predicate(
    "stable first page response is consistent with pagination metadata",
    page.pagination.records >= page.data.length,
  );
}
