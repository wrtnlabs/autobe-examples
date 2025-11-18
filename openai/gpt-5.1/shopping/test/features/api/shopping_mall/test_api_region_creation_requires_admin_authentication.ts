import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

/**
 * Validate that creating a region requires admin authentication.
 *
 * Business context: Region configuration (IShoppingMallRegion) is a sensitive
 * administrative capability, so POST
 * /shoppingMall/admin/countries/{countryCode}/regions must be accessible only
 * to authenticated admin actors. This test ensures that unauthenticated calls
 * fail while properly authenticated admin calls succeed.
 *
 * Scenario steps:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context and tokens (SDK will bind the token into the connection).
 * 2. Create a new country via POST /shoppingMall/admin/countries using the admin
 *    connection, capturing its country_code for later use.
 * 3. Build a valid IShoppingMallRegion.ICreate payload (code, name_en, optional
 *    region_type, is_active, sort_order).
 * 4. Derive an unauthenticated connection by cloning the original connection but
 *    setting headers: {} and never touching them again.
 * 5. With the unauthenticated connection, attempt to create a region under the
 *    previously created country using api.functional.shoppingMall.admin
 *    .countries.regions.create and the prepared payload. Wrap this in
 *    TestValidator.error with an async callback and await it, asserting that
 *    the call fails due to missing authentication (without checking specific
 *    HTTP status codes or messages).
 * 6. Using the authenticated admin connection (after join), call the same region
 *    creation endpoint again with the same payload. This time it should succeed
 *    and return a valid IShoppingMallRegion object.
 * 7. Validate the successful response with typia.assert and additional
 *    business-level assertions using TestValidator.equals to confirm that:
 *
 *    - The region.code matches the requested code.
 *    - The region.name_en matches the requested name_en.
 *    - The region.is_active and sort_order match the input.
 *    - The region.country.country_code matches the parent country’s country_code.
 */
export async function test_api_region_creation_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register an admin (join) to obtain authenticated admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a parent country using the authenticated admin connection
  const countryBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  // 3. Prepare region creation payload
  const regionBody = {
    code: RandomGenerator.alphaNumeric(6),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    region_type: "state",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  // 4. Derive an unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt region creation without authentication and expect failure
  await TestValidator.error(
    "unauthenticated region creation must fail",
    async () => {
      await api.functional.shoppingMall.admin.countries.regions.create(
        unauthenticatedConnection,
        {
          countryCode: country.country_code,
          body: regionBody,
        },
      );
    },
  );

  // 6. Perform region creation with authenticated admin connection
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  // 7. Business-level assertions on the created region
  TestValidator.equals(
    "region code should match input",
    region.code,
    regionBody.code,
  );
  TestValidator.equals(
    "region name_en should match input",
    region.name_en,
    regionBody.name_en,
  );
  TestValidator.equals(
    "region is_active should match input",
    region.is_active,
    regionBody.is_active,
  );
  TestValidator.equals(
    "region sort_order should match input",
    region.sort_order,
    regionBody.sort_order,
  );
  TestValidator.equals(
    "region country_code should match parent country",
    region.country.country_code,
    country.country_code,
  );
}
