import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
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

export async function test_api_organization_dashboard_summary_isolated_by_tenant(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Aa123456!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const firstPage =
    await api.functional.erpHrmTime.member.organizations.dashboardSummaries.index(
      memberConnection,
      {
        organizationId,
        body: {
          page: 1,
          limit: 2,
        } satisfies IErpHrmTimeOrganizationDashboardSummary.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page limit should match request",
    firstPage.pagination.limit,
    2,
  );
  TestValidator.equals(
    "first page current should match request",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "first page records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.erpHrmTime.member.organizations.dashboardSummaries.index(
        memberConnection,
        {
          organizationId,
          body: {
            page: 2,
            limit: 2,
          } satisfies IErpHrmTimeOrganizationDashboardSummary.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current should match request",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit should match request",
      secondPage.pagination.limit,
      2,
    );
    TestValidator.notEquals(
      "different pages within the same organization should not be identical when more than one page exists",
      JSON.stringify(firstPage.data),
      JSON.stringify(secondPage.data),
    );
  }
}
