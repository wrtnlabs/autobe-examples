import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";

/**
 * Validate that creating shopping mall countries enforces unique country_code.
 *
 * Business intent:
 *
 * - Shopping_mall_countries has a Prisma unique index on country_code.
 * - The admin-only creation API must reject a second insert with the same
 *   country_code, surfacing a clear client error instead of silently
 *   overwriting or duplicating records.
 *
 * Scenario steps:
 *
 * 1. Join an admin via POST /auth/admin/join so that the api.IConnection carries a
 *    valid admin Authorization token.
 * 2. Using this authenticated admin connection, call
 *    api.functional.shoppingMall.admin.countries.create once with a
 *    deterministic country_code like "US-UNIQUETEST" (or another randomly
 *    generated but re-usable string), providing valid values for:
 *
 *    - Country_code (unique business key)
 *    - Name_en (English name)
 *    - Is_active (boolean)
 *    - Sort_order (int32-compatible number)
 *    - Optionally phone_code (nullable/optional)
 * 3. Assert that the first creation call succeeds, that the response is a valid
 *    IShoppingMallCountry via typia.assert, and optionally verify that the echo
 *    country_code in the response matches the request.
 * 4. Attempt a second create using the same country_code but with different
 *    name_en and/or flags to prove that uniqueness is tied specifically to
 *    country_code, not the entire row contents.
 * 5. Wrap the second create call in TestValidator.error with an async closure to
 *    assert that the server rejects this duplicate country_code with a
 *    client-side error (such as a validation or conflict error). Do not assert
 *    a concrete HTTP status code; only verify that an error is thrown.
 *
 * Technical constraints:
 *
 * - Do not touch connection.headers directly; rely on
 *   api.functional.auth.admin.join to populate tokens.
 * - Use typia.random and RandomGenerator utilities as needed to build valid,
 *   realistic DTO payloads that satisfy IShoppingMallAdminJoin.ICreate and
 *   IShoppingMallCountry.ICreate. Use satisfies instead of type assertions.
 * - Await every API call and validate non-void responses with typia.assert().
 * - Implement all logic inside the provided template function body without adding
 *   new imports.
 */
export async function test_api_country_creation_enforces_country_code_uniqueness(
  connection: api.IConnection,
) {
  // 1. Register an admin, which also sets the Authorization header on the
  //    provided connection via the SDK.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an initial country with a specific (or reusable random)
  //    country_code.
  const uniqueCountryCode = `US-UNIQUETEST-${RandomGenerator.alphaNumeric(8)}`;

  const firstCountryBody = {
    country_code: uniqueCountryCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: null,
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
    "first created country_code matches input",
    firstCountry.country_code,
    firstCountryBody.country_code,
  );

  // 3. Attempt to create a second country with the same country_code but
  //    different other attributes. This should fail due to the unique index on
  //    country_code.
  const secondCountryBody = {
    country_code: uniqueCountryCode, // same as first
    name_en: RandomGenerator.paragraph({ sentences: 3 }),
    phone_code: "+1",
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
