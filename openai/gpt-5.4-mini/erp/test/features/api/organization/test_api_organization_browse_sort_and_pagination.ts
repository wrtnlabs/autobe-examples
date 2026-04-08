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

export async function test_api_organization_browse_sort_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const firstPageRequest = {
    page: 1,
    limit: 100,
    sort: "+createdAt",
  } satisfies IErpHrmTimeOrganizationDashboardSummary.IRequest;
  const firstPage = await api.functional.erpHrmTime.member.organizations.index(
    memberConnection,
    { body: firstPageRequest },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page current index",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page requested limit",
    firstPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "first page record count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page total pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data respects limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  const secondPageRequest = {
    page: 2,
    limit: 1,
    sort: "+createdAt",
  } satisfies IErpHrmTimeOrganizationDashboardSummary.IRequest;
  const secondPage = await api.functional.erpHrmTime.member.organizations.index(
    memberConnection,
    { body: secondPageRequest },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page current index",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page requested limit",
    secondPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "second page data respects limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  TestValidator.equals(
    "pagination total records is stable across pages",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "pagination total pages is stable across pages",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.notEquals(
      "first page and second page should not overlap",
      firstPage.data[0].id,
      secondPage.data[0].id,
    );
  }
  const cappedPage = await api.functional.erpHrmTime.member.organizations.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 999,
        sort: "+createdAt",
      } satisfies IErpHrmTimeOrganizationDashboardSummary.IRequest,
    },
  );
  typia.assert(cappedPage);
  TestValidator.predicate(
    "returned limit is capped by endpoint policy",
    cappedPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "capped page respects returned limit",
    cappedPage.data.length <= cappedPage.pagination.limit,
  );
  if (firstPage.data.length > 1) {
    const createdAtValues = firstPage.data.map((item) => item.createdAt);
    const sortedCreatedAtValues = [...createdAtValues].sort((a, b) =>
      a.localeCompare(b),
    );
    TestValidator.equals(
      "first page is sorted by createdAt ascending",
      createdAtValues,
      sortedCreatedAtValues,
    );
  }
}
