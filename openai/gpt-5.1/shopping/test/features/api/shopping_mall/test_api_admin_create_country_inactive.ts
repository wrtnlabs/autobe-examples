import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Validate that an admin can create a country in an inactive state.
 *
 * Business context:
 *
 * - Platform operators (admins) maintain a master list of countries that can be
 *   referenced by addresses, shipping rules, and configuration.
 * - A country may need to exist in the system, but be inactive so that it does
 *   not appear in user-facing selection lists yet.
 *
 * This test validates that:
 *
 * 1. An administrator can join (register) and obtain an authorized context.
 * 2. Using that admin context, the platform can create a new country record via
 *    POST /shoppingMall/admin/countries with `is_active = false`.
 * 3. The create operation succeeds and the response reflects the requested
 *    inactive state and other fields (country_code, name_en, sort_order,
 *    phone_code).
 *
 * High-level steps:
 *
 * 1. Call POST /auth/admin/join to create and authenticate an admin.
 * 2. As that admin, call POST /shoppingMall/admin/countries with an
 *    IShoppingMallCountry.ICreate payload that sets `is_active` to false and
 *    uses a realistic country_code, name_en, sort_order, and phone_code.
 * 3. Validate the response using typia.assert and TestValidator to ensure the
 *    returned entity mirrors the request fields, especially that `is_active`
 *    remains false.
 */
export async function test_api_admin_create_country_inactive(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Intentionally omit ip to allow server defaults
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an inactive country as that admin
  const countryCodeBase = "ZZ"; // pseudo ISO-like code to avoid collisions
  const countryCodeSuffix = RandomGenerator.alphabets(3).toUpperCase();
  const countryCode = `${countryCodeBase}${countryCodeSuffix}`;

  const createCountryBody = {
    country_code: countryCode,
    name_en: `Test Inactive Country ${RandomGenerator.name(1)}`,
    phone_code: "+999",
    is_active: false,
    sort_order: 100,
  } satisfies IShoppingMallCountry.ICreate;

  const createdCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: createCountryBody,
    });
  typia.assert<IShoppingMallCountry>(createdCountry);

  // 3. Validate response mirrors the request and is inactive
  TestValidator.equals(
    "created country_code should match request",
    createdCountry.country_code,
    createCountryBody.country_code,
  );

  TestValidator.equals(
    "created name_en should match request",
    createdCountry.name_en,
    createCountryBody.name_en,
  );

  TestValidator.equals(
    "created phone_code should match request",
    createdCountry.phone_code,
    createCountryBody.phone_code,
  );

  TestValidator.equals(
    "created is_active should be false",
    createdCountry.is_active,
    false,
  );

  TestValidator.equals(
    "created sort_order should match request",
    createdCountry.sort_order,
    createCountryBody.sort_order,
  );
}
