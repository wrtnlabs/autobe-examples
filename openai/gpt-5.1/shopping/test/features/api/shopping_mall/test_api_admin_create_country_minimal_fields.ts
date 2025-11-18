import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Validate that an authenticated admin can create a country with minimal
 * required fields.
 *
 * Business intent:
 *
 * - Admin joins the system and receives an authorization context.
 * - Using that admin session, they create a new country master record in
 *   shopping_mall_countries with only the mandatory fields populated.
 * - The API must persist the record and return an IShoppingMallCountry entity
 *   whose business fields reflect the request and whose lifecycle fields (id,
 *   created_at, updated_at, deleted_at) are correctly populated.
 *
 * Steps:
 *
 * 1. Register an admin with POST /auth/admin/join. The SDK automatically stores
 *    the admin JWT into the shared connection so subsequent calls are
 *    authorized as this admin.
 * 2. Build a minimal IShoppingMallCountry.ICreate payload:
 *
 *    - Country_code: unique random string (e.g., alphabetic code).
 *    - Name_en: human-friendly name.
 *    - Is_active: true.
 *    - Sort_order: a reasonable small integer like 100.
 *    - Phone_code: omitted to represent minimal fields.
 * 3. Call POST /shoppingMall/admin/countries with the payload.
 * 4. Validate the response:
 *
 *    - Typia.assert(output) to guarantee IShoppingMallCountry shape.
 *    - Country_code, name_en, is_active, sort_order equal request values.
 *    - Id is non-empty string.
 *    - Created_at and updated_at are non-empty strings.
 *    - Deleted_at is null or undefined (not deleted).
 */
export async function test_api_admin_create_country_minimal_fields(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare minimal country create payload
  const countryCode = `X${RandomGenerator.alphabets(2).toUpperCase()}`;
  const countryName = `Test Country ${RandomGenerator.alphabets(4).toUpperCase()}`;
  const sortOrder = 100;

  const createBody = {
    country_code: countryCode,
    name_en: countryName,
    is_active: true,
    sort_order: sortOrder,
    // phone_code intentionally omitted to test minimal required fields
  } satisfies IShoppingMallCountry.ICreate;

  // 3. Create country
  const createdCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallCountry>(createdCountry);

  // 4. Field-level validations
  TestValidator.equals(
    "country_code should match request payload",
    createdCountry.country_code,
    countryCode,
  );
  TestValidator.equals(
    "name_en should match request payload",
    createdCountry.name_en,
    countryName,
  );
  TestValidator.equals(
    "is_active should match request payload",
    createdCountry.is_active,
    true,
  );
  TestValidator.equals(
    "sort_order should match request payload",
    createdCountry.sort_order,
    sortOrder,
  );

  // Lifecycle fields sanity checks
  TestValidator.predicate(
    "id must be non-empty string",
    createdCountry.id.length > 0,
  );
  TestValidator.predicate(
    "created_at must be non-empty string",
    createdCountry.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be non-empty string",
    createdCountry.updated_at.length > 0,
  );

  // deleted_at should represent a non-deleted state: allow null or undefined
  const deletedAt = createdCountry.deleted_at ?? null;
  TestValidator.equals(
    "deleted_at should be null or undefined for newly created country",
    deletedAt,
    null,
  );
}
