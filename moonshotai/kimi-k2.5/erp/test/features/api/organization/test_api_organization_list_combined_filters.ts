import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_list_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member using authorize_member_join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // Step 2: Test combined filters - partial name, currency, createdAt range
  const combinedFiltersResult =
    await api.functional.erpHrm.member.organizations.index(memberConnection, {
      body: {
        name: "Tech",
        currency: "USD",
        createdAtFrom: "2026-01-01T00:00:00Z",
        createdAtTo: "2026-12-31T23:59:59Z",
        sortBy: "name",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IErpHrmOrganization.IRequest,
    });
  typia.assert(combinedFiltersResult);
  // Step 3: Verify response structure
  TestValidator.predicate(
    "response has pagination",
    combinedFiltersResult.pagination !== null &&
      combinedFiltersResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(combinedFiltersResult.data),
  );
  // Step 4: Verify all returned organizations match filter criteria
  for (const org of combinedFiltersResult.data) {
    // Name should contain "Tech" (partial match)
    TestValidator.predicate(
      "organization name matches partial filter",
      org.name.toLowerCase().includes("tech"),
    );
    // Currency should match
    TestValidator.equals(
      "organization currency matches filter",
      org.currency,
      "USD",
    );
    // Created date should be within range
    const createdAt = new Date(org.createdAt);
    const fromDate = new Date("2026-01-01T00:00:00Z");
    const toDate = new Date("2026-12-31T23:59:59Z");
    TestValidator.predicate(
      "organization createdAt within filter range",
      createdAt >= fromDate && createdAt <= toDate,
    );
  }
  // Step 5: Verify results are sorted alphabetically by name in ascending order
  if (combinedFiltersResult.data.length > 1) {
    for (let i = 0; i < combinedFiltersResult.data.length - 1; i++) {
      const current = combinedFiltersResult.data[i]!;
      const next = combinedFiltersResult.data[i + 1]!;
      TestValidator.predicate(
        "results sorted by name ascending",
        current.name.localeCompare(next.name) <= 0,
      );
    }
  }
  // Step 6: Verify pagination metadata
  TestValidator.predicate(
    "current page is valid",
    combinedFiltersResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    combinedFiltersResult.pagination.limit >= 1 &&
      combinedFiltersResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    combinedFiltersResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    combinedFiltersResult.pagination.pages >= 0,
  );
  TestValidator.equals(
    "data length matches records or is limited by pagination",
    combinedFiltersResult.data.length,
    Math.min(
      combinedFiltersResult.pagination.limit,
      combinedFiltersResult.pagination.records,
    ),
  );
  // Step 7: Test empty results possible - use impossible filters
  const emptyResult = await api.functional.erpHrm.member.organizations.index(
    memberConnection,
    {
      body: {
        name: "NonExistentOrganizationXYZ12345",
        currency: "USD",
        page: 1,
        limit: 20,
      } satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "non-matching filter returns empty data array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching filter returns zero records count",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-matching filter returns zero pages",
    emptyResult.pagination.pages,
    0,
  );
}
