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
 * Validate composite uniqueness of region codes per country.
 *
 * Business goal
 *
 * - Ensure that `shopping_mall_regions` enforces unique `code` per country via
 *   `[shopping_mall_country_id, code]` unique index
 * - Confirm that the same region `code` can be reused in another country
 *
 * Steps
 *
 * 1. Join an admin account via POST /auth/admin/join to obtain admin context
 * 2. Create two countries (e.g., "US" and "CA") via POST
 *    /shoppingMall/admin/countries
 * 3. Under first country (US), create region with code "EAST"
 * 4. Attempt to create another region with same code "EAST" under US and expect
 *    logical failure
 * 5. Under second country (CA), successfully create region with same code "EAST"
 */
export async function test_api_region_creation_enforces_composite_uniqueness_per_country(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create two distinct countries
  const usCountryCode = "US";
  const caCountryCode = "CA";

  const usSortOrder = typia.random<
    number & tags.Type<"int32">
  >() satisfies number as number;
  const caSortOrder = typia.random<
    number & tags.Type<"int32">
  >() satisfies number as number;

  const usCountryCreate = {
    country_code: usCountryCode,
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: usSortOrder,
  } satisfies IShoppingMallCountry.ICreate;

  const caCountryCreate = {
    country_code: caCountryCode,
    name_en: "Canada",
    phone_code: "+1",
    is_active: true,
    sort_order: caSortOrder,
  } satisfies IShoppingMallCountry.ICreate;

  const usCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: usCountryCreate,
    });
  typia.assert<IShoppingMallCountry>(usCountry);
  TestValidator.equals(
    "US country_code should match payload",
    usCountry.country_code,
    usCountryCode,
  );

  const caCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: caCountryCreate,
    });
  typia.assert<IShoppingMallCountry>(caCountry);
  TestValidator.equals(
    "CA country_code should match payload",
    caCountry.country_code,
    caCountryCode,
  );

  // 3. Create region with code "EAST" under US
  const regionCode = "EAST";

  const usRegionSortOrder = typia.random<
    number & tags.Type<"int32">
  >() satisfies number as number;

  const usRegionCreate = {
    code: regionCode,
    name_en: "US Eastern Region",
    region_type: "zone",
    is_active: true,
    sort_order: usRegionSortOrder,
  } satisfies IShoppingMallRegion.ICreate;

  const usRegion: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: usCountryCode,
        body: usRegionCreate,
      },
    );
  typia.assert<IShoppingMallRegion>(usRegion);
  TestValidator.equals(
    "US region country_code should be US",
    usRegion.country.country_code,
    usCountryCode,
  );
  TestValidator.equals(
    "US region code should match payload",
    usRegion.code,
    regionCode,
  );

  // 4. Attempt to create duplicate region code under the same US country
  const usRegionDuplicateSortOrder = typia.random<
    number & tags.Type<"int32">
  >() satisfies number as number;

  const usRegionDuplicateCreate = {
    code: regionCode,
    name_en: "US Eastern Region Duplicate",
    region_type: "zone",
    is_active: true,
    sort_order: usRegionDuplicateSortOrder,
  } satisfies IShoppingMallRegion.ICreate;

  await TestValidator.error(
    "duplicate region code in same country must fail",
    async () => {
      await api.functional.shoppingMall.admin.countries.regions.create(
        connection,
        {
          countryCode: usCountryCode,
          body: usRegionDuplicateCreate,
        },
      );
    },
  );

  // 5. Create same region code under CA country (should succeed)
  const caRegionSortOrder = typia.random<
    number & tags.Type<"int32">
  >() satisfies number as number;

  const caRegionCreate = {
    code: regionCode,
    name_en: "Canada Eastern Region",
    region_type: "zone",
    is_active: true,
    sort_order: caRegionSortOrder,
  } satisfies IShoppingMallRegion.ICreate;

  const caRegion: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: caCountryCode,
        body: caRegionCreate,
      },
    );
  typia.assert<IShoppingMallRegion>(caRegion);
  TestValidator.equals(
    "CA region country_code should be CA",
    caRegion.country.country_code,
    caCountryCode,
  );
  TestValidator.equals(
    "CA region code should match shared code",
    caRegion.code,
    regionCode,
  );
}
