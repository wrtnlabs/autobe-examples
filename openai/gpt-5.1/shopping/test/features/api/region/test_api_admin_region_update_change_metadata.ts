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
 * Validate that an admin can update non-critical metadata of a region (name_en,
 * region_type, sort_order) without changing its identity (id, code, is_active,
 * parent country).
 *
 * Business flow:
 *
 * 1. Admin joins (POST /auth/admin/join) to establish authenticated context.
 * 2. Admin creates a country (POST /shoppingMall/admin/countries).
 * 3. Admin creates a region within that country (POST
 *    /shoppingMall/admin/countries/{countryCode}/regions).
 * 4. Admin updates the region metadata (PUT
 *    /shoppingMall/admin/countries/{countryCode}/regions/{regionCode}).
 * 5. The test asserts identity invariants and metadata changes.
 */
export async function test_api_admin_region_update_change_metadata(
  connection: api.IConnection,
) {
  // 1. Join admin to obtain authorized context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!", // format: "password" but plain string is fine
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: RandomGenerator.name(2),
    phone_code: "+82",
    is_active: true,
    sort_order: 10,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  TestValidator.equals(
    "country_code should match creation payload",
    country.country_code,
    countryCode,
  );

  // 3. Create a region under that country
  const regionCode = RandomGenerator.alphabets(4).toUpperCase();
  const initialRegionType = "state";

  const regionCreateBody = {
    code: regionCode,
    name_en: RandomGenerator.name(2),
    region_type: initialRegionType,
    is_active: true,
    sort_order: 100,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  TestValidator.equals(
    "region.code should match creation payload",
    region.code,
    regionCode,
  );

  TestValidator.equals(
    "region country summary should reference created country id",
    region.country.id,
    country.id,
  );

  TestValidator.equals(
    "region country summary should reference created country_code",
    region.country.country_code,
    country.country_code,
  );

  const originalUpdatedAt = region.updated_at;
  const originalIsActive = region.is_active;
  const originalNameEn = region.name_en;
  const originalRegionType = region.region_type ?? null;
  const originalSortOrder = region.sort_order;

  // 4. Update region metadata: change name_en, region_type, sort_order; omit is_active
  const newNameEn = `${originalNameEn} (updated)`;
  const newRegionType =
    originalRegionType === "province" ? "state" : "province";
  const newSortOrder = originalSortOrder + 1;

  const regionUpdateBody = {
    name_en: newNameEn,
    region_type: newRegionType,
    sort_order: newSortOrder,
  } satisfies IShoppingMallRegion.IUpdate;

  const updatedRegion: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.update(
      connection,
      {
        countryCode: country.country_code,
        regionCode: region.code,
        body: regionUpdateBody,
      },
    );
  typia.assert(updatedRegion);

  // 5. Assertions: identity invariants and metadata changes
  TestValidator.equals(
    "updated region id should remain the same",
    updatedRegion.id,
    region.id,
  );

  TestValidator.equals(
    "updated region code should remain the same",
    updatedRegion.code,
    region.code,
  );

  TestValidator.equals(
    "updated region is_active should remain unchanged when omitted",
    updatedRegion.is_active,
    originalIsActive,
  );

  TestValidator.equals(
    "updated region country id should remain the same",
    updatedRegion.country.id,
    region.country.id,
  );

  TestValidator.equals(
    "updated region country_code should remain the same",
    updatedRegion.country.country_code,
    region.country.country_code,
  );

  TestValidator.equals(
    "updated region name_en should reflect new value",
    updatedRegion.name_en,
    newNameEn,
  );

  TestValidator.equals(
    "updated region region_type should reflect new value",
    updatedRegion.region_type,
    newRegionType,
  );

  TestValidator.equals(
    "updated region sort_order should reflect new value",
    updatedRegion.sort_order,
    newSortOrder,
  );

  await TestValidator.predicate(
    "updated_at should be changed after update",
    async () => updatedRegion.updated_at !== originalUpdatedAt,
  );
}
