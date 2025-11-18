import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCountry";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Validate free-text country search using the `search` field on PATCH
 * /shoppingMall/countries.
 *
 * Business intent: Ensure that the search endpoint for country master data
 * correctly applies a case-insensitive, partial match over `country_code` and
 * `name_en`, and does not return unrelated records.
 *
 * Scenario:
 *
 * 1. Register an admin account using POST /auth/admin/join so that the SDK
 *    attaches an admin JWT token to the connection.
 * 2. As this admin, create several country master records via POST
 *    /shoppingMall/admin/countries using carefully chosen codes and English
 *    names:
 *
 *    - One with `name_en` containing "United" (e.g., "United States").
 *    - Another with `name_en` also containing "United" (e.g., "United Kingdom").
 *    - A clearly unrelated country like "Korea".
 * 3. Call PATCH /shoppingMall/countries with IShoppingMallCountry.IRequest where:
 *
 *    - `search` is the lowercase fragment "united";
 *    - `limit` is large enough to include all created countries (e.g., 10);
 *    - `page` is 0 and other filters are left undefined.
 * 4. Assert that:
 *
 *    - The response conforms to IPageIShoppingMallCountry.ISummary via typia.assert.
 *    - Every returned summary's `name_en` or `country_code` contains the fragment
 *         "united" in a case-insensitive way.
 *    - The unrelated country (e.g., "Korea") is not present in the result.
 * 5. Additionally, perform a second search using a fragment that matches only
 *    codes or only names (for example, `search = "GB"` or `search = "States"`)
 *    to confirm that the search covers both code and name fields.
 */
export async function test_api_countries_search_free_text_search_field(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authorized context for admin-only endpoints.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Seed deterministic country records with names/codes around "United".
  const countryUnitedStatesBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const countryUnitedKingdomBody = {
    country_code: "GB",
    name_en: "United Kingdom",
    phone_code: "+44",
    is_active: true,
    sort_order: 2,
  } satisfies IShoppingMallCountry.ICreate;

  const countryKoreaBody = {
    country_code: "KR",
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 3,
  } satisfies IShoppingMallCountry.ICreate;

  const us: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryUnitedStatesBody,
    });
  typia.assert<IShoppingMallCountry>(us);

  const gb: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryUnitedKingdomBody,
    });
  typia.assert<IShoppingMallCountry>(gb);

  const kr: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryKoreaBody,
    });
  typia.assert<IShoppingMallCountry>(kr);

  // 3. Perform search with fragment "united" to test case-insensitive contains
  // behavior across both code and name.
  const searchFragment = "united";
  const requestUnited = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    search: searchFragment,
  } satisfies IShoppingMallCountry.IRequest;

  const pageUnited: IPageIShoppingMallCountry.ISummary =
    await api.functional.shoppingMall.countries.index(connection, {
      body: requestUnited,
    });
  typia.assert<IPageIShoppingMallCountry.ISummary>(pageUnited);

  const summariesUnited = pageUnited.data;

  // 4. Assert pagination sanity.
  TestValidator.predicate(
    "pagination current page should be 0 for 'united' search",
    pageUnited.pagination.current === 0,
  );
  TestValidator.predicate(
    "returned count for 'united' search should be <= limit",
    summariesUnited.length <= pageUnited.pagination.limit,
  );

  // Helper for case-insensitive contains on name or code.
  const matchUnited = (summary: IShoppingMallCountry.ISummary): boolean => {
    const lowerName = summary.name_en.toLowerCase();
    const lowerCode = summary.country_code.toLowerCase();
    const fragment = searchFragment.toLowerCase();
    return lowerName.includes(fragment) || lowerCode.includes(fragment);
  };

  // 5. Assert all returned summaries are matches and unrelated KR is excluded.
  TestValidator.predicate(
    "all countries from 'united' search must match fragment in code or name",
    summariesUnited.every(matchUnited),
  );

  TestValidator.predicate(
    "unrelated 'Korea' country must not appear in 'united' search results",
    summariesUnited.every((summary) => summary.id !== kr.id),
  );

  // 6. Additional search focusing on name fragment "States".
  const nameFragment = "States";
  const requestStates = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    search: nameFragment,
  } satisfies IShoppingMallCountry.IRequest;

  const pageStates: IPageIShoppingMallCountry.ISummary =
    await api.functional.shoppingMall.countries.index(connection, {
      body: requestStates,
    });
  typia.assert<IPageIShoppingMallCountry.ISummary>(pageStates);

  const summariesStates = pageStates.data;

  TestValidator.predicate(
    "pagination current page should be 0 for 'States' search",
    pageStates.pagination.current === 0,
  );

  TestValidator.predicate(
    "all countries from 'States' search must contain fragment in code or name",
    summariesStates.every((summary) => {
      const lowerName = summary.name_en.toLowerCase();
      const lowerCode = summary.country_code.toLowerCase();
      const fragment = nameFragment.toLowerCase();
      return lowerName.includes(fragment) || lowerCode.includes(fragment);
    }),
  );

  TestValidator.predicate(
    "'United States' must appear in 'States' search results when created",
    summariesStates.some((summary) => summary.id === us.id),
  );

  TestValidator.predicate(
    "unrelated 'Korea' still must not appear in 'States' search results",
    summariesStates.every((summary) => summary.id !== kr.id),
  );
}
