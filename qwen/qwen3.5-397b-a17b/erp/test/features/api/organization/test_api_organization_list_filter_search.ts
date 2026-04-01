import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization list filtering and search functionality.
 *
 * This test validates:
 * 1. Member authentication is required to access organization list
 * 2. Search by organization name using partial match returns matching organizations
 * 3. Filter by currency code returns only organizations with matching currency
 * 4. Filter by timezone returns only organizations with matching timezone
 * 5. Combined filters work correctly (e.g., currency + timezone)
 * 6. Empty results are returned when no organizations match the filter criteria
 */
export async function test_api_organization_list_filter_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to access organization list
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Test basic list retrieval without filters
  const allOrgs = await api.functional.hrmPlatform.member.organizations.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(allOrgs);
  TestValidator.predicate(
    "pagination is valid",
    allOrgs.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", allOrgs.pagination.limit >= 1);
  TestValidator.predicate(
    "records count is non-negative",
    allOrgs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    allOrgs.pagination.pages >= 0,
  );
  // 3. Test search by organization name (partial match)
  const searchName = RandomGenerator.name();
  const searchResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          search: searchName,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search results are filtered",
    searchResult.data.every((org) =>
      org.name.toLowerCase().includes(searchName.toLowerCase()),
    ),
  );
  // 4. Test filter by currency code
  const currencyCode = "USD";
  const currencyResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          currency: currencyCode,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(currencyResult);
  TestValidator.predicate(
    "currency filter works",
    currencyResult.data.every((org) => org.currency === currencyCode),
  );
  // 5. Test filter by timezone
  const timezone = "America/New_York";
  const timezoneResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          timezone: timezone,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(timezoneResult);
  TestValidator.predicate(
    "timezone filter works",
    timezoneResult.data.every((org) => org.timezone === timezone),
  );
  // 6. Test combined filters (currency + timezone)
  const combinedResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          currency: currencyCode,
          timezone: timezone,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filters work",
    combinedResult.data.every(
      (org) => org.currency === currencyCode && org.timezone === timezone,
    ),
  );
  // 7. Test empty results with non-matching filter
  const emptyResult =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          currency: "NONEXISTENT_CURRENCY_12345",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty results data", emptyResult.data, []);
  TestValidator.equals(
    "empty results records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty results pages", emptyResult.pagination.pages, 0);
}
