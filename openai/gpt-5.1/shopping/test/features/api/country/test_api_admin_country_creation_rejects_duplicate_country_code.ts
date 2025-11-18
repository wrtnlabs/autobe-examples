import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Validate that admin country creation enforces uniqueness of country_code.
 *
 * Business goal:
 *
 * - Ensure that POST /shoppingMall/admin/countries does not allow two different
 *   records to be created with the same business identifier `country_code` when
 *   called by an authenticated admin.
 *
 * High-level workflow:
 *
 * 1. Join an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context and implicit JWT token handling inside the SDK.
 * 2. Using that admin context, create a first country with a unique `country_code`
 *    via POST /shoppingMall/admin/countries.
 * 3. Assert that the first creation succeeds and that a valid IShoppingMallCountry
 *    object is returned.
 * 4. Attempt to create a second country with the _same_ `country_code` but
 *    different other properties (e.g., name_en, is_active, sort_order,
 *    phone_code) to simulate a duplicate business key.
 * 5. Assert that the second creation attempt fails at runtime using
 *    TestValidator.error, treating any thrown error as a failure of the
 *    operation (business-level uniqueness enforcement). Do not validate
 *    specific HTTP status codes or error body details, only that an error
 *    occurs.
 *
 * Constraints and rules:
 *
 * - Use only the imported SDK functions:
 *
 *   - Api.functional.auth.admin.join
 *   - Api.functional.shoppingMall.admin.countries.create
 * - Use the DTO types exactly as defined:
 *
 *   - IShoppingMallAdminJoin.ICreate for admin join body
 *   - IShoppingMallCountry.ICreate for country creation body
 *   - IShoppingMallCountry for successful country creation response
 *   - IShoppingMallAdmin.IAuthorized and IAuthorizationToken only for compile-time
 *       type safety (typia.assert on the join response).
 * - All request bodies must be object literals with `satisfies` on the
 *   appropriate DTO type; never use `as` or `as any`.
 * - Do not attempt to test type validation, missing required fields, or wrong
 *   data types. All payloads must be well-typed.
 * - Do not inspect or assert on specific HTTP status codes, and do not introspect
 *   error response bodies. Only assert that an error is thrown for the
 *   duplicate creation.
 * - Do not touch `connection.headers` directly; rely on the SDK to manage
 *   authentication tokens after admin join.
 * - Use TestValidator.equals/TestValidator.predicate with descriptive titles for
 *   simple business checks (e.g., first response country_code matches the
 *   request value).
 * - Use RandomGenerator and typia.random to construct realistic but
 *   strongly-typed values (e.g., random email, URI, etc.).
 */
export async function test_api_admin_country_creation_rejects_duplicate_country_code(
  connection: api.IConnection,
) {
  // 1. Prepare and perform admin join to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create the first country with a unique business country_code
  const uniqueCountryCode = `DUP_TEST_${RandomGenerator.alphaNumeric(8)}`;

  const firstCountryBody = {
    country_code: uniqueCountryCode,
    name_en: `Country ${RandomGenerator.paragraph({ sentences: 1 })}`,
    phone_code: "+999",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const firstCountry = await api.functional.shoppingMall.admin.countries.create(
    connection,
    {
      body: firstCountryBody,
    },
  );
  typia.assert<IShoppingMallCountry>(firstCountry);

  TestValidator.equals(
    "first country creation: response country_code matches request",
    firstCountry.country_code,
    uniqueCountryCode,
  );

  // 3. Attempt to create a second country with the same country_code
  const secondCountryBody = {
    country_code: uniqueCountryCode,
    name_en: `Duplicate ${RandomGenerator.paragraph({ sentences: 1 })}`,
    phone_code: "+998",
    is_active: false,
    sort_order: 2,
  } satisfies IShoppingMallCountry.ICreate;

  await TestValidator.error(
    "duplicate country_code creation must fail",
    async () => {
      await api.functional.shoppingMall.admin.countries.create(connection, {
        body: secondCountryBody,
      });
    },
  );
}
