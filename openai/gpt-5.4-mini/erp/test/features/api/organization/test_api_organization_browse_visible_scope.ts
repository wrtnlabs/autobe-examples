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

export async function test_api_organization_browse_visible_scope(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: typia.random<string & tags.Format<"uri">>(),
      phoneNumber: RandomGenerator.mobile(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  const searchTerm = "acme";
  const createdAtFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const createdAtTo = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const limit = 5;
  const response = await api.functional.erpHrmTime.member.organizations.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit,
        search: searchTerm,
        status: "active",
        createdAtFrom,
        createdAtTo,
        sort: "+createdAt",
      } satisfies IErpHrmTimeOrganizationDashboardSummary.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "pagination current should match requested page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    response.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length should not exceed page limit",
    response.data.length <= limit,
  );
  for (const organization of response.data) {
    typia.assert(organization);
    TestValidator.predicate(
      "organization name should match search scope when search is present",
      organization.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    TestValidator.equals(
      "organization status should match filter",
      organization.status,
      "active",
    );
    TestValidator.predicate(
      "organization createdAt should be within requested lower bound",
      organization.createdAt >= createdAtFrom,
    );
    TestValidator.predicate(
      "organization createdAt should be within requested upper bound",
      organization.createdAt <= createdAtTo,
    );
  }
  const emptySearch =
    await api.functional.erpHrmTime.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: RandomGenerator.alphabets(20),
        } satisfies IErpHrmTimeOrganizationDashboardSummary.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search should return first page",
    emptySearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search should keep requested limit",
    emptySearch.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "empty search should return no unrelated organizations",
    emptySearch.data.length === 0,
  );
}
