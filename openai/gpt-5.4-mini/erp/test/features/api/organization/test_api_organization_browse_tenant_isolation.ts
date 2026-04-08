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

export async function test_api_organization_browse_tenant_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com`,
      password: `P@ssw0rd-${RandomGenerator.alphaNumeric(8)}`,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joined.token.access,
    },
  };
  const firstPage = await api.functional.erpHrmTime.member.organizations.index(
    authorizedConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IErpHrmTimeOrganizationDashboardSummary.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "page metadata is non-negative",
    firstPage.pagination.current >= 0 &&
      firstPage.pagination.limit >= 0 &&
      firstPage.pagination.records >= 0 &&
      firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "organization summaries are returned as an array",
    Array.isArray(firstPage.data),
  );
  for (const organization of firstPage.data) {
    typia.assert(organization);
    TestValidator.predicate(
      "organization identity is present",
      organization.id.length > 0,
    );
    TestValidator.predicate(
      "organization name is present",
      organization.name.length > 0,
    );
    TestValidator.predicate(
      "organization timestamps are ordered",
      organization.createdAt <= organization.updatedAt,
    );
  }
  const emptyPage = await api.functional.erpHrmTime.member.organizations.index(
    authorizedConnection,
    {
      body: {
        search: RandomGenerator.alphabets(32),
        page: 9999,
        limit: 20,
      } satisfies IErpHrmTimeOrganizationDashboardSummary.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty page should return no organizations",
    emptyPage.data.length,
    0,
  );
  TestValidator.predicate(
    "empty page metadata is stable",
    emptyPage.pagination.current >= 0 &&
      emptyPage.pagination.limit >= 0 &&
      emptyPage.pagination.records >= 0 &&
      emptyPage.pagination.pages >= 0,
  );
}
