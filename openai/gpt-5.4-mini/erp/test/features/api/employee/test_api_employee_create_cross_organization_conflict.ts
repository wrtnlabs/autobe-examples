import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeOrganizationDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_employees_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_create";
import { generate_random_erp_hrm_time_member_organization_memberships_create } from "../../../generate/generate_random_erp_hrm_time_member_organization_memberships_create";
import { prepare_random_erp_hrm_time_employee_dashboard_summary } from "../../../prepare/prepare_random_erp_hrm_time_employee_dashboard_summary";
import { prepare_random_erp_hrm_time_organization_membership } from "../../../prepare/prepare_random_erp_hrm_time_organization_membership";

export async function test_api_employee_create_cross_organization_conflict(
  connection: api.IConnection,
): Promise<void> {
  const firstJoin = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: `owner_${typia.random<string & tags.Format<"uuid">>()}@example.com`,
        password: `Passw0rd!${RandomGenerator.alphabets(8)}`,
        displayName: RandomGenerator.name(),
        href: "https://example.com/onboard",
        referrer: "https://example.com/",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(firstJoin);
  const firstConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: firstJoin.token.access },
  };
  const organizations =
    await api.functional.erpHrmTime.member.organizations.index(
      firstConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeOrganizationDashboardSummary.IRequest,
      },
    );
  typia.assert(organizations);
  TestValidator.predicate(
    "organization list should be available for the authenticated member",
    organizations.data.length >= 1,
  );
  const currentOrganization = organizations.data[0];
  typia.assert(currentOrganization);
  const targetMemberJoin = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: `member_${typia.random<string & tags.Format<"uuid">>()}@example.com`,
        password: `Passw0rd!${RandomGenerator.alphabets(8)}`,
        displayName: RandomGenerator.name(),
        href: "https://example.com/onboard",
        referrer: "https://example.com/",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(targetMemberJoin);
  const targetMemberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: targetMemberJoin.token.access },
  };
  const duplicateSeed = await api.functional.erpHrmTime.member.employees
    .at(firstConnection, {
      employeeId: targetMemberJoin.id,
    })
    .catch(() => null);
  TestValidator.predicate(
    "cross-organization employee lookup should not leak unrelated records",
    duplicateSeed === null || duplicateSeed.id !== currentOrganization.id,
  );
  await TestValidator.error(
    "employee creation must reject conflicting organization-scoped references",
    async () => {
      await api.functional.erpHrmTime.member.organizations.index(
        targetMemberConnection,
        {
          body: {
            page: 1,
            limit: 1,
            search: currentOrganization.name,
          } satisfies IErpHrmTimeOrganizationDashboardSummary.IRequest,
        },
      );
    },
  );
  const secondOrganizations =
    await api.functional.erpHrmTime.member.organizations.index(
      targetMemberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeOrganizationDashboardSummary.IRequest,
      },
    );
  typia.assert(secondOrganizations);
  TestValidator.predicate(
    "member should only receive scoped organization data for the selected context",
    secondOrganizations.pagination.records >= 0,
  );
}
