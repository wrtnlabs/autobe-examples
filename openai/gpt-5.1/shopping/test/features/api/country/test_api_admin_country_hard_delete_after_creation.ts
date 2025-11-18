import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Admin-only hard delete of a shopping mall country after creation.
 *
 * Business goal
 *
 * - Verify that an authenticated administrator can create a country master record
 *   and then hard-delete it using the DELETE
 *   /shoppingMall/admin/countries/{countryCode} endpoint.
 * - Confirm that the erase operation is keyed by the business `country_code`
 *   field and that a second deletion attempt fails, demonstrating that the
 *   record is actually removed.
 *
 * Scenario
 *
 * 1. Join as an admin using POST /auth/admin/join
 *
 *    - Build an IShoppingMallAdminJoin.ICreate payload with:
 *
 *         - Email: random email
 *         - Password: random password-like string
 *         - Href: some realistic URL
 *         - Referrer: some realistic URL (can be different from href)
 *    - Call api.functional.auth.admin.join(connection, { body })
 *    - The SDK will automatically set connection.headers.Authorization using the
 *         returned access token. Do NOT manipulate headers manually.
 *    - Assert the returned IShoppingMallAdmin.IAuthorized via typia.assert.
 * 2. Create a new country as this admin
 *
 *    - Build an IShoppingMallCountry.ICreate body with:
 *
 *         - Country_code: a unique string such as "ZZ_TEST_" + random suffix
 *         - Name_en: a readable name string
 *         - Phone_code: e.g., "+999" (optional but we can set it)
 *         - Is_active: true
 *         - Sort_order: some int32 value (e.g., 999).
 *    - Call api.functional.shoppingMall.admin.countries.create(connection, { body })
 *    - Assert the response type with typia.assert.
 *    - Verify key business fields using TestValidator.equals:
 *
 *         - Response.country_code equals request.country_code
 *         - Response.name_en equals request.name_en
 *         - Response.phone_code equals request.phone_code
 *         - Response.is_active equals true
 *         - Response.sort_order equals request.sort_order.
 * 3. Hard-delete the country by its business code
 *
 *    - Call api.functional.shoppingMall.admin.countries.erase(connection, {
 *         countryCode: created.country_code, })
 *    - This returns void; just await it. Do NOT call typia.assert on void.
 * 4. Verify non-idempotent behavior with a second DELETE
 *
 *    - Use TestValidator.httpError with an async closure to confirm that a second
 *         DELETE on the same country_code fails with an HTTP error. Because the
 *         SDK wraps HTTP failures in api.HttpError, this is the safest way to
 *         express the expectation without relying on a specific status code.
 *    - For example: await TestValidator.httpError("second erase should fail", [400,
 *         404, 410], async () => { await
 *         api.functional.shoppingMall.admin.countries.erase(connection, {
 *         countryCode: created.country_code }); });
 *    - Note: we specify multiple acceptable client-side error codes in case the
 *         backend uses different not-found semantics; we only care that it no
 *         longer behaves like a successful delete.
 * 5. Optional sanity checks
 *
 *    - Add predicates to ensure that the initially created country was active before
 *         deletion, confirming that we are deleting a valid active record, not
 *         one already soft-deleted.
 *    - Use TestValidator.predicate with descriptive titles.
 */
export async function test_api_admin_country_hard_delete_after_creation(
  connection: api.IConnection,
) {
  // 1. Admin join to establish authorized admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new country record as this admin
  const countryCodePrefix = "ZZ_TEST_";
  const countryCodeSuffix = RandomGenerator.alphaNumeric(8);
  const countryCode = `${countryCodePrefix}${countryCodeSuffix}`;

  const createCountryBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+999",
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallCountry.ICreate;

  const createdCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: createCountryBody,
    });
  typia.assert<IShoppingMallCountry>(createdCountry);

  // Business field equality checks
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
    "created is_active should be true",
    createdCountry.is_active,
    true,
  );
  TestValidator.equals(
    "created sort_order should match request",
    createdCountry.sort_order,
    createCountryBody.sort_order,
  );

  // Sanity predicate: ensure the country is active before deletion
  TestValidator.predicate(
    "country must be active before hard delete",
    createdCountry.is_active,
  );

  // 3. Hard-delete the country by its business code
  await api.functional.shoppingMall.admin.countries.erase(connection, {
    countryCode: createdCountry.country_code,
  });

  // 4. Second DELETE should fail with an HTTP error (non-idempotent behavior)
  await TestValidator.httpError(
    "second erase on same countryCode should fail with client or not-found error",
    [400, 404, 410],
    async () => {
      await api.functional.shoppingMall.admin.countries.erase(connection, {
        countryCode: createdCountry.country_code,
      });
    },
  );
}
