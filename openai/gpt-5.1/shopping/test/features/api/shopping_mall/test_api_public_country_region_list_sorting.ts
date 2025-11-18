import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRegion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

/**
 * Validate server-side sorting of public region listings for a country.
 *
 * Business goal:
 *
 * - Ensure that the public endpoint PATCH
 *   /shoppingMall/countries/{countryCode}/regions respects the
 *   IShoppingMallRegion.IRequest.order_by and order_direction fields to control
 *   sorting of regions belonging to a country.
 * - Confirm that public (anonymous) clients can rely on server-side ordering
 *   instead of doing their own sorting on the client.
 *
 * Flow:
 *
 * 1. Admin setup
 *
 *    - Join as an admin using POST /auth/admin/join.
 *    - Create a country via POST /shoppingMall/admin/countries with a deterministic
 *         country_code (e.g., "TST" + random suffix) and known configuration
 *         values.
 *    - Under this country, create three regions via POST
 *         /shoppingMall/admin/countries/{countryCode}/regions, with known
 *         combinations of:
 *
 *         - Code: deterministic unique codes (e.g., "R1", "R2", "R3").
 *         - Name_en: distinct values with known lexical order, such as "Alpha", "Bravo",
 *                   "Charlie".
 *         - Sort_order: distinct int32 values like 20, 10, 30 to make sorted order easy
 *                   to check.
 *         - Region_type/is_active configured consistently (e.g., all active).
 * 2. Public region listing and sorting validation
 *
 *    - Using the same connection (admin token may still be present but the endpoint
 *         is public), call PATCH /shoppingMall/countries/{countryCode}/regions
 *         with IShoppingMallRegion.IRequest bodies: a) order_by = "sort_order",
 *         order_direction = "asc". - Expect regions ordered by ascending
 *         sort_order. b) order_by = "sort_order", order_direction = "desc". -
 *         Expect regions ordered by descending sort_order. c) order_by =
 *         "name_en", order_direction = "asc". - Expect regions ordered
 *         lexicographically by name_en.
 *    - For each call:
 *
 *         - Assert result type using typia.assert.
 *         - Use TestValidator.equals / predicate to check that:
 *
 *                           - All three created regions are present.
 *                           - The order of region ids in the response matches the expected sorted order
 *                                               derived from the known fixtures.
 * 3. Default ordering stability (optional but implemented)
 *
 *    - Call PATCH without order_by and order_direction.
 *    - Call it again with the same body (same page/limit/search filters).
 *    - Assert that the sequence of region ids is identical across the two calls,
 *         proving stable default ordering.
 *
 * Important constraints / notes:
 *
 * - Use the correct DTO types:
 *
 *   - IShoppingMallAdminJoin.ICreate for admin join body.
 *   - IShoppingMallCountry.ICreate for country creation body.
 *   - IShoppingMallRegion.ICreate for region creation body.
 *   - IShoppingMallRegion.IRequest for listing body.
 *   - IShoppingMallCountry, IShoppingMallRegion, and
 *       IPageIShoppingMallRegion.ISummary for responses.
 * - Always use `satisfies` when constructing request bodies; do not use type
 *   assertions like `as`.
 * - Do not touch `connection.headers` directly; rely on the SDK to manage
 *   authorization headers.
 * - Use RandomGenerator and typia.random for generating values that are not
 *   critical to the sorting logic (e.g., phone_code).
 */
export async function test_api_public_country_region_list_sorting(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create country with deterministic-ish country_code
  const countryCodeBase = "TST";
  const countryCodeSuffix = RandomGenerator.alphabets(3).toUpperCase();
  const countryCode = `${countryCodeBase}${countryCodeSuffix}`;

  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    phone_code: "+82",
    is_active: true,
    sort_order: 100,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);
  TestValidator.equals(
    "created country_code should match input",
    country.country_code,
    countryCode,
  );

  // 3. Create three regions with controlled sort_order and name_en
  type RegionFixture = {
    code: string;
    name_en: string;
    sort_order: number;
  };

  const regionFixtures: RegionFixture[] = [
    { code: "R1", name_en: "Bravo", sort_order: 20 },
    { code: "R2", name_en: "Alpha", sort_order: 10 },
    { code: "R3", name_en: "Charlie", sort_order: 30 },
  ];

  const createdRegions: IShoppingMallRegion[] = [];

  for (const fixture of regionFixtures) {
    const regionBody = {
      code: fixture.code,
      name_en: fixture.name_en,
      region_type: "test_region",
      is_active: true,
      sort_order: fixture.sort_order,
    } satisfies IShoppingMallRegion.ICreate;

    const region: IShoppingMallRegion =
      await api.functional.shoppingMall.admin.countries.regions.create(
        connection,
        {
          countryCode,
          body: regionBody,
        },
      );
    typia.assert(region);
    createdRegions.push(region);
  }

  TestValidator.equals(
    "three regions should be created",
    createdRegions.length,
    3,
  );

  // Helper to assert that response data contains exactly our three regions
  const assertContainsAllRegions = (
    title: string,
    page: IPageIShoppingMallRegion.ISummary,
  ) => {
    const idsFromResponse = page.data.map((r) => r.id);
    const expectedIds = createdRegions.map((r) => r.id);

    TestValidator.equals(
      `${title} - number of regions should be three`,
      idsFromResponse.length,
      3,
    );

    const missing = expectedIds.filter(
      (id) => idsFromResponse.indexOf(id) === -1,
    );
    TestValidator.equals(
      `${title} - all created regions should be present`,
      missing.length,
      0,
    );
  };

  // Helper to assert order of region ids matches expected order
  const assertOrder = (
    title: string,
    page: IPageIShoppingMallRegion.ISummary,
    expectedOrderedIds: string[],
  ) => {
    const actualOrderedIds = page.data.map((r) => r.id);
    TestValidator.equals(
      `${title} - ordered ids should match expected`,
      actualOrderedIds,
      expectedOrderedIds,
    );
  };

  // Derive expected orders from createdRegions and fixtures
  const bySortAsc = [...createdRegions].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const bySortDesc = [...bySortAsc].slice().reverse();
  const byNameAsc = [...createdRegions].sort((a, b) =>
    a.name_en.localeCompare(b.name_en),
  );

  const expectedSortAscIds = bySortAsc.map((r) => r.id);
  const expectedSortDescIds = bySortDesc.map((r) => r.id);
  const expectedNameAscIds = byNameAsc.map((r) => r.id);

  // 4a. order_by = sort_order, order_direction = asc
  const requestSortAsc = {
    page: 1,
    limit: 10,
    order_by: "sort_order",
    order_direction: "asc",
  } satisfies IShoppingMallRegion.IRequest;

  const pageSortAsc: IPageIShoppingMallRegion.ISummary =
    await api.functional.shoppingMall.countries.regions.index(connection, {
      countryCode,
      body: requestSortAsc,
    });
  typia.assert(pageSortAsc);
  assertContainsAllRegions("sort_order asc", pageSortAsc);
  assertOrder("sort_order asc", pageSortAsc, expectedSortAscIds);

  // 4b. order_by = sort_order, order_direction = desc
  const requestSortDesc = {
    page: 1,
    limit: 10,
    order_by: "sort_order",
    order_direction: "desc",
  } satisfies IShoppingMallRegion.IRequest;

  const pageSortDesc: IPageIShoppingMallRegion.ISummary =
    await api.functional.shoppingMall.countries.regions.index(connection, {
      countryCode,
      body: requestSortDesc,
    });
  typia.assert(pageSortDesc);
  assertContainsAllRegions("sort_order desc", pageSortDesc);
  assertOrder("sort_order desc", pageSortDesc, expectedSortDescIds);

  // 4c. order_by = name_en, order_direction = asc
  const requestNameAsc = {
    page: 1,
    limit: 10,
    order_by: "name_en",
    order_direction: "asc",
  } satisfies IShoppingMallRegion.IRequest;

  const pageNameAsc: IPageIShoppingMallRegion.ISummary =
    await api.functional.shoppingMall.countries.regions.index(connection, {
      countryCode,
      body: requestNameAsc,
    });
  typia.assert(pageNameAsc);
  assertContainsAllRegions("name_en asc", pageNameAsc);
  assertOrder("name_en asc", pageNameAsc, expectedNameAscIds);

  // 5. Default ordering stability: two identical requests without explicit order
  const defaultRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallRegion.IRequest;

  const defaultPage1: IPageIShoppingMallRegion.ISummary =
    await api.functional.shoppingMall.countries.regions.index(connection, {
      countryCode,
      body: defaultRequest,
    });
  typia.assert(defaultPage1);
  assertContainsAllRegions("default ordering first call", defaultPage1);

  const defaultPage2: IPageIShoppingMallRegion.ISummary =
    await api.functional.shoppingMall.countries.regions.index(connection, {
      countryCode,
      body: defaultRequest,
    });
  typia.assert(defaultPage2);
  assertContainsAllRegions("default ordering second call", defaultPage2);

  const defaultIds1 = defaultPage1.data.map((r) => r.id);
  const defaultIds2 = defaultPage2.data.map((r) => r.id);
  TestValidator.equals(
    "default ordering should be stable across calls",
    defaultIds1,
    defaultIds2,
  );
}
