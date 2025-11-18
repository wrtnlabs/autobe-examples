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
 * Validate that hard-deleting a country is blocked when dependent regions
 * exist.
 *
 * Business context:
 *
 * - Countries are master records used by many downstream configurations such as
 *   regions, addresses, and shipping rules.
 * - The DELETE /shoppingMall/admin/countries/{countryCode} endpoint is a
 *   hard-delete for exceptional cleanup, and must protect referential integrity
 *   or policy rules when there are dependent records.
 *
 * Scenario steps:
 *
 * 1. Join an admin with POST /auth/admin/join; the SDK wires the admin
 *    Authorization token into the connection headers.
 * 2. As that admin, create a country via POST /shoppingMall/admin/countries with a
 *    unique country_code.
 * 3. Under that country, create a region via POST
 *    /shoppingMall/admin/countries/{countryCode}/regions.
 * 4. Attempt to hard-delete the country using DELETE
 *    /shoppingMall/admin/countries/{countryCode}.
 * 5. Expect the deletion to be rejected by the backend (error thrown) because
 *    dependent regions exist; validate using TestValidator.error.
 *
 * Note: The available SDK in this test template does not expose GET endpoints
 * for country/region, so post-delete existence is checked indirectly via the
 * fact that erase fails when a region exists.
 */
export async function test_api_admin_country_hard_delete_blocked_by_references(
  connection: api.IConnection,
) {
  // 1. Admin join and acquire authorized context (token is auto-wired).
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-console.shoppingmall.test/join",
    referrer: "https://admin-console.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country master record as this admin.
  const countryCode = `TST-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;

  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+99",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  TestValidator.equals(
    "created country_code must match request",
    country.country_code,
    countryCode,
  );

  // 3. Create a dependent region under this country.
  const regionCode = `REG-${RandomGenerator.alphaNumeric(4).toUpperCase()}`;

  const regionCreateBody = {
    code: regionCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    region_type: "test-region",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  TestValidator.equals(
    "region.country.country_code should match parent country_code",
    region.country.country_code,
    countryCode,
  );

  // 4. Attempt hard-delete of the country. Expect failure due to dependencies.
  await TestValidator.error(
    "hard delete country must be blocked when regions exist",
    async () => {
      await api.functional.shoppingMall.admin.countries.erase(connection, {
        countryCode: countryCode,
      });
    },
  );
}
