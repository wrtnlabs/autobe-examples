import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_member_organizations_create";
import { prepare_random_erp_hrm_time_organization } from "../../../prepare/prepare_random_erp_hrm_time_organization";

export async function test_api_employee_dashboard_summary_multi_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const organizationConnectionA: api.IConnection = { host: connection.host };
  organizationConnectionA.headers = {
    Authorization: member.token.access,
  };
  const organizationA =
    await generate_random_erp_hrm_time_member_organizations_create(
      organizationConnectionA,
      {
        body: {
          name: `${RandomGenerator.name()} A`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(organizationA);
  const organizationConnectionB: api.IConnection = { host: connection.host };
  organizationConnectionB.headers = {
    Authorization: member.token.access,
  };
  const organizationB =
    await generate_random_erp_hrm_time_member_organizations_create(
      organizationConnectionB,
      {
        body: {
          name: `${RandomGenerator.name()} B`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(organizationB);
  const dashboardConnectionA: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  const dashboardA =
    await api.functional.erpHrmTime.member.employee_dashboard_summary.at(
      dashboardConnectionA,
    );
  typia.assert(dashboardA);
  const dashboardConnectionB: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  const dashboardB =
    await api.functional.erpHrmTime.member.employee_dashboard_summary.at(
      dashboardConnectionB,
    );
  typia.assert(dashboardB);
  TestValidator.predicate(
    "organization contexts should be distinct",
    organizationA.id !== organizationB.id,
  );
  TestValidator.notEquals(
    "dashboard snapshots should not collapse into a single shared payload",
    dashboardA,
    dashboardB,
  );
  TestValidator.predicate(
    "dashboard snapshot should include the employee relation",
    dashboardA.employee !== null && dashboardB.employee !== null,
  );
  TestValidator.predicate(
    "dashboard snapshot should expose organization-specific timing fields",
    dashboardA.snapshotAt !== dashboardB.snapshotAt ||
      dashboardA.recentTimelogSnapshotAt !==
        dashboardB.recentTimelogSnapshotAt ||
      dashboardA.hoursLoggedThisWeek !== dashboardB.hoursLoggedThisWeek,
  );
}
