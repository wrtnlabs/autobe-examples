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
 * Validate that regions can be created for an inactive country.
 *
 * Business intent: This test ensures that administrative configuration of
 * regions is possible even when the parent country is not yet active for
 * end-user flows. The platform should allow an admin to stage configuration
 * (countries and regions) prior to enabling them in production UX.
 *
 * Scenario:
 *
 * 1. Join as an admin using POST /auth/admin/join, which also issues authorization
 *    tokens and attaches them to the connection.
 * 2. Create a country with is_active=false using POST
 *    /shoppingMall/admin/countries so that it is not yet exposed to end users
 *    but exists in configuration.
 * 3. Create a region under that inactive country using POST
 *    /shoppingMall/admin/countries/{countryCode}/regions with a valid
 *    IShoppingMallRegion.ICreate payload.
 * 4. Verify that the region creation succeeds and returns a IShoppingMallRegion
 *    whose country.country_code matches the country we created and whose core
 *    fields (code, name_en, is_active, sort_order) match the request.
 *
 * This focuses on the allowed configuration path (regions may be created for
 * inactive countries) and does not attempt to assert error codes or type
 * validation behavior.
 */
export async function test_api_region_creation_respects_country_activation_status(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context.
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Passw0rd!", // conforms to Format<"password"> at type level
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an inactive country configuration.
  const countryCode = `CC-${RandomGenerator.alphaNumeric(4)}`;
  const countryBody = {
    country_code: countryCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+999",
    is_active: false,
    sort_order: 100,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  // Basic sanity checks on created country.
  TestValidator.equals(
    "created country_code should match request",
    country.country_code,
    countryCode,
  );
  TestValidator.equals(
    "created country is_active should be false",
    country.is_active,
    false,
  );

  // 3. Create a region under the inactive country.
  const regionCode = `REG-${RandomGenerator.alphaNumeric(4)}`;
  const regionBody = {
    code: regionCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    region_type: "province",
    is_active: true,
    sort_order: 10,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: countryCode,
        body: regionBody,
      },
    );
  typia.assert(region);

  // 4. Validate region and its linkage to the inactive country.
  TestValidator.equals(
    "region code should match request",
    region.code,
    regionCode,
  );
  TestValidator.equals(
    "region name_en should match request",
    region.name_en,
    regionBody.name_en,
  );
  TestValidator.equals(
    "region is_active should match request",
    region.is_active,
    regionBody.is_active,
  );
  TestValidator.equals(
    "region sort_order should match request",
    region.sort_order,
    regionBody.sort_order,
  );
  TestValidator.equals(
    "region.country.country_code should match parent country_code",
    region.country.country_code,
    countryCode,
  );

  // Also confirm that the parent country in the region payload is still inactive,
  // showing that configuration can be staged before activating the country.
  TestValidator.equals(
    "region.country.is_active should still be false",
    region.country.is_active,
    false,
  );
}
