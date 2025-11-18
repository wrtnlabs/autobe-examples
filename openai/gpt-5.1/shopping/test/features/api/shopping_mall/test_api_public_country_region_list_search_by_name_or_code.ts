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

export async function test_api_public_country_region_list_search_by_name_or_code(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorization context for seeding
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a test country
  const countryCode = `TST-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;

  const countryCreateBody = {
    country_code: countryCode,
    name_en: "Testland",
    phone_code: "+999",
    is_active: true,
    sort_order: 1 satisfies number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);
  TestValidator.equals(
    "created country_code matches request",
    country.country_code,
    countryCode,
  );

  // 3. Seed regions under that country
  const regionNorthBody = {
    code: "NORTH",
    name_en: "North District",
    region_type: "test-region",
    is_active: true,
    sort_order: 1 satisfies number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const regionSouthBody = {
    code: "SOUTH",
    name_en: "South Plains",
    region_type: "test-region",
    is_active: true,
    sort_order: 2 satisfies number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const regionEastBody = {
    code: "EAST",
    name_en: "Eastern Heights",
    region_type: "test-region",
    is_active: true,
    sort_order: 3 satisfies number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const regionNorth: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionNorthBody,
      },
    );
  typia.assert<IShoppingMallRegion>(regionNorth);

  const regionSouth: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionSouthBody,
      },
    );
  typia.assert<IShoppingMallRegion>(regionSouth);

  const regionEast: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionEastBody,
      },
    );
  typia.assert<IShoppingMallRegion>(regionEast);

  // 4. Prepare an anonymous/public connection (no Authorization header)
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Helper to check inclusion/exclusion in result sets
  const containsRegionById = (
    list: IShoppingMallRegion.ISummary[],
    id: string,
  ): boolean => list.some((r) => r.id === id);

  const matchesSearch = (value: string, keyword: string): boolean =>
    value.includes(keyword);

  // 5. Search by name: "South" should match only South Plains
  const searchByNameRequest = {
    page: 1 satisfies number & tags.Type<"int32">,
    limit: 20 satisfies number & tags.Type<"int32">,
    search: "South",
  } satisfies IShoppingMallRegion.IRequest;

  const searchByNameResult: IPageIShoppingMallRegion.ISummary =
    await api.functional.shoppingMall.countries.regions.index(
      publicConnection,
      {
        countryCode,
        body: searchByNameRequest,
      },
    );
  typia.assert<IPageIShoppingMallRegion.ISummary>(searchByNameResult);

  TestValidator.predicate(
    "search 'South' should return at least one result",
    searchByNameResult.pagination.records >= 1 &&
      searchByNameResult.data.length >= 1,
  );
  TestValidator.predicate(
    "search 'South' should include South Plains region",
    containsRegionById(searchByNameResult.data, regionSouth.id),
  );
  TestValidator.predicate(
    "search 'South' should not include North or East regions",
    !containsRegionById(searchByNameResult.data, regionNorth.id) &&
      !containsRegionById(searchByNameResult.data, regionEast.id),
  );

  // Additionally ensure that all results actually match the keyword in name_en or code
  for (const summary of searchByNameResult.data) {
    TestValidator.predicate(
      "every result for 'South' must have 'South' in code or name_en",
      matchesSearch(summary.name_en, "South") ||
        matchesSearch(summary.code, "South"),
    );
  }

  // 6. Search by code: "NORTH" should match only NORTH region
  const searchByCodeRequest = {
    page: 1 satisfies number & tags.Type<"int32">,
    limit: 20 satisfies number & tags.Type<"int32">,
    search: "NORTH",
  } satisfies IShoppingMallRegion.IRequest;

  const searchByCodeResult: IPageIShoppingMallRegion.ISummary =
    await api.functional.shoppingMall.countries.regions.index(
      publicConnection,
      {
        countryCode,
        body: searchByCodeRequest,
      },
    );
  typia.assert<IPageIShoppingMallRegion.ISummary>(searchByCodeResult);

  TestValidator.predicate(
    "search 'NORTH' should return at least one result",
    searchByCodeResult.pagination.records >= 1 &&
      searchByCodeResult.data.length >= 1,
  );
  TestValidator.predicate(
    "search 'NORTH' should include NORTH region",
    containsRegionById(searchByCodeResult.data, regionNorth.id),
  );
  TestValidator.predicate(
    "search 'NORTH' should not include SOUTH or EAST regions",
    !containsRegionById(searchByCodeResult.data, regionSouth.id) &&
      !containsRegionById(searchByCodeResult.data, regionEast.id),
  );

  for (const summary of searchByCodeResult.data) {
    TestValidator.predicate(
      "every result for 'NORTH' must have 'NORTH' in code or name_en",
      matchesSearch(summary.name_en, "NORTH") ||
        matchesSearch(summary.code, "NORTH"),
    );
  }

  // 7. Search with no matches: use a keyword that should not exist
  const noMatchKeyword = `UNKNOWN_${RandomGenerator.alphaNumeric(8).toUpperCase()}`;

  const searchNoMatchRequest = {
    page: 1 satisfies number & tags.Type<"int32">,
    limit: 20 satisfies number & tags.Type<"int32">,
    search: noMatchKeyword,
  } satisfies IShoppingMallRegion.IRequest;

  const searchNoMatchResult: IPageIShoppingMallRegion.ISummary =
    await api.functional.shoppingMall.countries.regions.index(
      publicConnection,
      {
        countryCode,
        body: searchNoMatchRequest,
      },
    );
  typia.assert<IPageIShoppingMallRegion.ISummary>(searchNoMatchResult);

  TestValidator.equals(
    "no-match search should have zero records",
    searchNoMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no-match search should return empty data array",
    searchNoMatchResult.data.length,
    0,
  );

  TestValidator.predicate(
    "no-match search pages should be non-negative and logically consistent",
    searchNoMatchResult.pagination.pages >= 0 &&
      searchNoMatchResult.pagination.current >= 0,
  );
}
