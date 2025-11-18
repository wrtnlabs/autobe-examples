import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Validate that an authenticated admin can create a country with an optional
 * phone_code and that all provided fields are reflected correctly in the
 * response.
 *
 * Business context:
 *
 * - Countries are master data in shopping_mall_countries and are managed only by
 *   admins.
 * - Phone_code is optional but, when provided, should be stored and exposed on
 *   read.
 * - Admin authentication is required to call the admin country creation endpoint.
 *
 * Scenario steps:
 *
 * 1. Register a new admin via POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate to obtain an authenticated admin context
 *    (SDK will store the token on connection).
 * 2. Build a deterministic IShoppingMallCountry.ICreate payload including:
 *
 *    - Country_code: a unique test code like "KR_TEST_01" (or randomized to avoid
 *         conflicts).
 *    - Name_en: a human-readable English name.
 *    - Phone_code: a realistic dialing prefix such as "+82".
 *    - Is_active: true.
 *    - Sort_order: a distinct int32 number, easy to recognize in debugging.
 * 3. Call POST /shoppingMall/admin/countries with that payload.
 * 4. Assert with typia.assert that the response is a valid IShoppingMallCountry.
 * 5. Use TestValidator.equals (with descriptive titles) to verify that:
 *
 *    - Response.country_code equals request.country_code.
 *    - Response.name_en equals request.name_en.
 *    - Response.phone_code equals request.phone_code.
 *    - Response.is_active equals request.is_active.
 *    - Response.sort_order equals request.sort_order.
 *
 * This proves that the optional phone_code field is accepted and persisted, and
 * that admin-only creation works when authenticated via /auth/admin/join.
 */
export async function test_api_admin_country_creation_with_optional_phone_code(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain an authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare a unique country creation payload including optional phone_code
  const countryCodeSuffix = RandomGenerator.alphaNumeric(6);
  const sortOrder = typia.random<number & tags.Type<"int32">>();

  const createBody = {
    country_code: `KR_TEST_${countryCodeSuffix}`,
    name_en: `Korea Test ${countryCodeSuffix}`,
    phone_code: "+82",
    is_active: true,
    sort_order: sortOrder,
  } satisfies IShoppingMallCountry.ICreate;

  // 3. Create the country via admin endpoint
  const createdCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallCountry>(createdCountry);

  // 4. Validate that response fields match the request payload
  TestValidator.equals(
    "country_code should match the created payload",
    createdCountry.country_code,
    createBody.country_code,
  );

  TestValidator.equals(
    "name_en should match the created payload",
    createdCountry.name_en,
    createBody.name_en,
  );

  TestValidator.equals(
    "phone_code should match the created payload including optional field",
    createdCountry.phone_code,
    createBody.phone_code,
  );

  TestValidator.equals(
    "is_active should match the created payload",
    createdCountry.is_active,
    createBody.is_active,
  );

  TestValidator.equals(
    "sort_order should match the created payload",
    createdCountry.sort_order,
    createBody.sort_order,
  );
}
