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
 * Verify that the region detail endpoint reflects a region's activation flag
 * correctly and is publicly readable.
 *
 * Business goal
 *
 * - Ensure that IShoppingMallRegion.is_active is accurately exposed by the public
 *   GET /shoppingMall/countries/{countryCode}/regions/{regionCode} endpoint.
 * - Confirm the endpoint does not depend on admin authentication for reads and
 *   can be called in a public (unauthenticated) context.
 *
 * Scenario
 *
 * 1. Register an admin using POST /auth/admin/join to obtain an authorized admin
 *    context and token via IShoppingMallAdmin.IAuthorized.
 * 2. As the admin, create a country via POST /shoppingMall/admin/countries with an
 *    IShoppingMallCountry.ICreate payload and capture its country_code.
 * 3. Create a first region for that country via POST
 *    /shoppingMall/admin/countries/{countryCode}/regions using
 *    IShoppingMallRegion.ICreate, explicitly setting is_active=false.
 * 4. Call GET /shoppingMall/countries/{countryCode}/regions/{regionCode} for that
 *    first region, relying only on the connection host (no special auth
 *    handling in the test) and assert:
 *
 *    - Response type matches IShoppingMallRegion via typia.assert.
 *    - Region.is_active is false.
 *    - Region.code equals the code used at creation.
 *    - Region.name_en equals the name used at creation.
 *    - Region.country.country_code equals the parent country_code created in step 2
 *         and basic summary fields are consistent.
 * 5. Because no region update endpoint exists in the provided SDK, simulate a
 *    toggle scenario by creating a second region in the same country with a
 *    different code but is_active=true.
 * 6. Call GET /shoppingMall/countries/{countryCode}/regions/{regionCode} for that
 *    second region and assert:
 *
 *    - Response is IShoppingMallRegion and typia.assert passes.
 *    - Region.is_active is true.
 *    - Region.code and name_en match the second region’s creation payload.
 *    - Region.country summary again matches the same parent country.
 *
 * This test ensures that the detail endpoint faithfully reports each region's
 * activation state and that the read access pattern is public, independent of
 * the admin-only creation operations.
 */
export async function test_api_region_detail_reflects_region_activation_flag(
  connection: api.IConnection,
) {
  // 1. Register an admin (join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a country as admin
  const countryBody = {
    country_code: RandomGenerator.alphaNumeric(3).toUpperCase(),
    name_en: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  // 3. Create first region with is_active=false
  const firstRegionCode = RandomGenerator.alphaNumeric(6).toUpperCase();
  const firstRegionBody = {
    code: firstRegionCode,
    name_en: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    region_type: null,
    is_active: false,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  const firstRegion: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: firstRegionBody,
      },
    );
  typia.assert<IShoppingMallRegion>(firstRegion);

  // 4. Publicly read first region detail and assert inactive state
  const firstRegionDetail: IShoppingMallRegion =
    await api.functional.shoppingMall.countries.regions.at(connection, {
      countryCode: country.country_code,
      regionCode: firstRegion.code,
    });
  typia.assert<IShoppingMallRegion>(firstRegionDetail);

  TestValidator.equals(
    "first region should be inactive in detail view",
    firstRegionDetail.is_active,
    false,
  );
  TestValidator.equals(
    "first region code should match creation payload",
    firstRegionDetail.code,
    firstRegionBody.code,
  );
  TestValidator.equals(
    "first region name_en should match creation payload",
    firstRegionDetail.name_en,
    firstRegionBody.name_en,
  );
  TestValidator.equals(
    "first region country_code should match parent country",
    firstRegionDetail.country.country_code,
    country.country_code,
  );

  // 5. Create second region with is_active=true
  const secondRegionCode = RandomGenerator.alphaNumeric(6).toUpperCase();
  const secondRegionBody = {
    code: secondRegionCode,
    name_en: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    region_type: "city",
    is_active: true,
    sort_order: 2,
  } satisfies IShoppingMallRegion.ICreate;

  const secondRegion: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: secondRegionBody,
      },
    );
  typia.assert<IShoppingMallRegion>(secondRegion);

  // 6. Publicly read second region detail and assert active state
  const secondRegionDetail: IShoppingMallRegion =
    await api.functional.shoppingMall.countries.regions.at(connection, {
      countryCode: country.country_code,
      regionCode: secondRegion.code,
    });
  typia.assert<IShoppingMallRegion>(secondRegionDetail);

  TestValidator.equals(
    "second region should be active in detail view",
    secondRegionDetail.is_active,
    true,
  );
  TestValidator.equals(
    "second region code should match creation payload",
    secondRegionDetail.code,
    secondRegionBody.code,
  );
  TestValidator.equals(
    "second region name_en should match creation payload",
    secondRegionDetail.name_en,
    secondRegionBody.name_en,
  );
  TestValidator.equals(
    "second region country_code should match parent country",
    secondRegionDetail.country.country_code,
    country.country_code,
  );
}
