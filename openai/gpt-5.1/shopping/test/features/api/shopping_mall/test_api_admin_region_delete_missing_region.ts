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
 * Verify that deleting a non-existent region results in a business error
 * without affecting existing regions or the parent country.
 *
 * Business scenario:
 *
 * 1. An admin joins the platform and gets authenticated.
 * 2. The admin creates a country master record.
 * 3. The admin creates a valid region under that country.
 * 4. The admin attempts to hard-delete a region using a regionCode that does not
 *    exist for that country, which must fail with an error.
 * 5. After the failed delete, the admin can still create another region for the
 *    same country, indicating that the failed delete produced no destructive
 *    side effects on country/region configuration.
 *
 * Due to available SDK limitations, the test does not directly verify HTTP
 * status codes or re-fetch regions; instead it focuses on:
 *
 * - Ensuring the erase call errors when the region is missing.
 * - Ensuring further writes (region creation) still succeed afterwards.
 */
export async function test_api_admin_region_delete_missing_region(
  connection: api.IConnection,
) {
  // 1. Admin joins (registration + implicit authentication)
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a country master record
  const countryBody = {
    country_code: `TC-${RandomGenerator.alphaNumeric(6)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  // 3. Create an initial control region under this country
  const baseRegionCode = `REG-${RandomGenerator.alphaNumeric(4)}`;
  const regionCreateBody = {
    code: baseRegionCode,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    region_type: "province",
    is_active: true,
    sort_order: 1,
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

  // 4. Attempt to delete a non-existent region
  const missingRegionCode = `${baseRegionCode}-MISSING`;

  await TestValidator.error(
    "delete non-existent region should fail",
    async () => {
      await api.functional.shoppingMall.admin.countries.regions.erase(
        connection,
        {
          countryCode: country.country_code,
          regionCode: missingRegionCode,
        },
      );
    },
  );

  // 5. Ensure that configuration remains healthy by creating another region
  const secondRegionBody = {
    code: `${baseRegionCode}-2`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert(secondRegion);
}
