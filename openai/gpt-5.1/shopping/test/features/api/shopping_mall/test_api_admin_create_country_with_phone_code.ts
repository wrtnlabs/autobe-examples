import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Validate that an authenticated admin can create a country with phone_code,
 * and that the phone_code and other core fields are persisted correctly.
 *
 * Flow:
 *
 * 1. Register a new admin via POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate.
 *
 *    - This both creates the admin account and authenticates the connection for
 *         subsequent admin-only operations.
 * 2. As the authenticated admin, call POST /shoppingMall/admin/countries using
 *    IShoppingMallCountry.ICreate.
 *
 *    - Provide:
 *
 *         - Country_code: unique string value.
 *         - Name_en: human-readable English name.
 *         - Phone_code: realistic dialing prefix string such as "+82".
 *         - Is_active: true.
 *         - Sort_order: reasonable 32-bit integer for ordering.
 * 3. Validate that the returned IShoppingMallCountry:
 *
 *    - Passes typia.assert for type/shape validation.
 *    - Has phone_code matching the input phone_code.
 *    - Has country_code, name_en, is_active, sort_order matching the input.
 *    - Has a non-empty id and timestamps created_at/updated_at present
 *         (structural/format correctness is trusted to typia.assert; here we
 *         focus on business-level equality checks).
 */
export async function test_api_admin_create_country_with_phone_code(
  connection: api.IConnection,
) {
  // 1. Register a new admin via /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. As the authenticated admin, create a country with phone_code
  const inputPhoneCode = "+82";
  const countryCreateBody = {
    country_code: `TEST-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 3 }),
    phone_code: inputPhoneCode,
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallCountry.ICreate;

  const createdCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(createdCountry);

  // 3. Business-level validations
  TestValidator.equals(
    "country_code should be persisted as provided",
    createdCountry.country_code,
    countryCreateBody.country_code,
  );

  TestValidator.equals(
    "name_en should be persisted as provided",
    createdCountry.name_en,
    countryCreateBody.name_en,
  );

  TestValidator.equals(
    "phone_code should be persisted as provided",
    createdCountry.phone_code,
    countryCreateBody.phone_code,
  );

  TestValidator.equals(
    "is_active should be persisted as provided",
    createdCountry.is_active,
    countryCreateBody.is_active,
  );

  TestValidator.equals(
    "sort_order should be persisted as provided",
    createdCountry.sort_order,
    countryCreateBody.sort_order,
  );

  // id presence check (type and format already validated by typia.assert)
  TestValidator.predicate(
    "created country id should be a non-empty string",
    createdCountry.id.length > 0,
  );
}
