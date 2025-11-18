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
 * Validate searching countries by exact country_code using the public search
 * endpoint.
 *
 * Business flow:
 *
 * 1. Register an admin via POST /auth/admin/join.
 * 2. As the admin, create at least two distinct countries with unique country_code
 *    values via POST /shoppingMall/admin/countries.
 * 3. Call PATCH /shoppingMall/countries filtering by one of the country_code
 *    values and verify that exactly one matching record is returned and that
 *    all of its fields match the created country master record.
 * 4. Ensure that the other created country does not appear in the filtered result.
 * 5. Issue an additional search with a differently cased country_code and assert
 *    that the endpoint behaves consistently with its own response (without
 *    hard-coding assumptions about case sensitivity).
 */
export async function test_api_countries_search_by_country_code_exact_match(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an authorized context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create two distinct countries with unique country_code values.
  const countryCode1 = "US";
  const countryCode2 = "KR";

  const createCountryBody1 = {
    country_code: countryCode1,
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const createCountryBody2 = {
    country_code: countryCode2,
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: false,
    sort_order: 2,
  } satisfies IShoppingMallCountry.ICreate;

  const createdCountry1: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: createCountryBody1,
    });
  typia.assert(createdCountry1);

  const createdCountry2: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: createCountryBody2,
    });
  typia.assert(createdCountry2);

  // 3. Search countries by exact country_code for the first country.
  const searchRequestExact = {
    page: 0,
    limit: 10,
    country_code: countryCode1,
  } satisfies IShoppingMallCountry.IRequest;

  const searchResultExact: IPageIShoppingMallCountry.ISummary =
    await api.functional.shoppingMall.countries.index(connection, {
      body: searchRequestExact,
    });
  typia.assert(searchResultExact);

  // 4. Validate pagination and data for the exact match search.
  TestValidator.equals(
    "exact search should return exactly one record in pagination.records",
    searchResultExact.pagination.records,
    1,
  );

  TestValidator.predicate(
    "pagination.limit should be at least 1",
    searchResultExact.pagination.limit >= 1,
  );

  TestValidator.equals(
    "exact search should return exactly one data item",
    searchResultExact.data.length,
    1,
  );

  const summary = searchResultExact.data[0];
  // Ensure the summary matches the created country1 fields.
  TestValidator.equals(
    "summary.id should match created country id",
    summary.id,
    createdCountry1.id,
  );
  TestValidator.equals(
    "summary.country_code should match created country country_code",
    summary.country_code,
    createdCountry1.country_code,
  );
  TestValidator.equals(
    "summary.name_en should match created country name_en",
    summary.name_en,
    createdCountry1.name_en,
  );
  TestValidator.equals(
    "summary.phone_code should match created country phone_code",
    summary.phone_code ?? null,
    createdCountry1.phone_code ?? null,
  );
  TestValidator.equals(
    "summary.is_active should match created country is_active",
    summary.is_active,
    createdCountry1.is_active,
  );
  TestValidator.equals(
    "summary.sort_order should match created country sort_order",
    summary.sort_order,
    createdCountry1.sort_order,
  );
  TestValidator.equals(
    "summary.created_at should match created country created_at",
    summary.created_at,
    createdCountry1.created_at,
  );
  TestValidator.equals(
    "summary.updated_at should match created country updated_at",
    summary.updated_at,
    createdCountry1.updated_at,
  );

  // Ensure that the other created country does not appear in the result.
  TestValidator.predicate(
    "other created country must not appear in exact country_code search",
    searchResultExact.data.every((c) => c.id !== createdCountry2.id),
  );

  // 5. Case variation search: use lowercased country code and assert internal consistency.
  const lowerCasedCode = countryCode1.toLowerCase();
  const searchRequestCaseVariant = {
    page: 0,
    limit: 10,
    country_code: lowerCasedCode,
  } satisfies IShoppingMallCountry.IRequest;

  const searchResultCaseVariant: IPageIShoppingMallCountry.ISummary =
    await api.functional.shoppingMall.countries.index(connection, {
      body: searchRequestCaseVariant,
    });
  typia.assert(searchResultCaseVariant);

  if (searchResultCaseVariant.pagination.records === 0) {
    // When no records are returned, ensure data is empty as well.
    TestValidator.equals(
      "case-variant search with zero records should return empty data array",
      searchResultCaseVariant.data.length,
      0,
    );
  } else {
    // When some records are returned, enforce internal consistency:
    // all summaries must have the same country_code as the one returned in the exact search.
    TestValidator.predicate(
      "case-variant search should return only countries matching the reference country_code",
      searchResultCaseVariant.data.every(
        (c) => c.country_code === summary.country_code,
      ),
    );
  }
}
