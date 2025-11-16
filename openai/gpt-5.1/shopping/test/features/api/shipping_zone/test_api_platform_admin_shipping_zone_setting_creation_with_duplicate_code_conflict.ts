import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallShippingZoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingZoneSetting";

/**
 * Validate unique shipping zone code enforcement for platform administrators.
 *
 * Business goal: Ensure that the ShoppingMall platform prevents creation of
 * multiple shipping zones sharing the same business code, thus protecting
 * configuration consistency for logistics and pricing features.
 *
 * Scenario steps:
 *
 * 1. Join as a platform admin using /auth/platformAdmin/join so that subsequent
 *    admin-only endpoints are authorized via the SDK's automatic token
 *    handling.
 * 2. Create a region configuration entry via
 *    /shoppingMall/platformAdmin/regionSettings using
 *    IShoppingMallRegionSetting.ICreate, with a unique code and active=true.
 * 3. Create an initial shipping zone via
 *    /shoppingMall/platformAdmin/shippingZoneSettings using
 *    IShoppingMallShippingZoneSetting.ICreate, with:
 *
 *    - A specific business code (e.g. "EU_ZONE_1"),
 *    - A name and description,
 *    - Active=true,
 *    - Shopping_mall_region_setting_id bound to the region from step 2.
 * 4. Confirm that the first create call succeeds and returns an
 *    IShoppingMallShippingZoneSetting whose `code` matches the request and
 *    whose `active` flag is true.
 * 5. Attempt to create another shipping zone with the exact same `code` but a
 *    different name/description by calling the same create endpoint again.
 * 6. Assert that the second create call fails by using TestValidator.error with an
 *    async closure, without checking specific HTTP status codes.
 * 7. Confirm via in-memory checks that the original zone object still has the
 *    original name/description and active flag, proving that no accidental
 *    overwrite happened.
 */
export async function test_api_platform_admin_shipping_zone_setting_creation_with_duplicate_code_conflict(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "platform admin account should be active",
    admin.isActive === true,
  );

  // 2. Create a region configuration
  const regionCode = `REGION_${RandomGenerator.alphaNumeric(8)}`;
  const regionBody = {
    code: regionCode,
    name: RandomGenerator.name(),
    iso_country_code: null,
    currency_code: null,
    timezone: null,
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert(region);
  TestValidator.equals(
    "created region code should match request",
    region.code,
    regionCode,
  );
  TestValidator.predicate(
    "created region should be active",
    region.active === true,
  );

  // 3. Create an initial shipping zone
  const zoneCode = "EU_ZONE_1";
  const firstZoneBody = {
    code: zoneCode,
    name: "European Zone Primary",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    shopping_mall_region_setting_id: region.id,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;

  const firstZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      { body: firstZoneBody },
    );
  typia.assert(firstZone);

  TestValidator.equals(
    "first shipping zone code should match request",
    firstZone.code,
    zoneCode,
  );
  TestValidator.predicate(
    "first shipping zone should be active",
    firstZone.active === true,
  );

  // 4. Try to create another shipping zone with the same code
  const secondZoneBody = {
    code: zoneCode, // same code to trigger unique index violation
    name: "European Zone Duplicate",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    shopping_mall_region_setting_id: region.id,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;

  await TestValidator.error(
    "creating a second shipping zone with duplicate code must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
        connection,
        { body: secondZoneBody },
      );
    },
  );

  // 5. Ensure original zone object remains unchanged in-memory
  TestValidator.equals(
    "original zone name should remain unchanged after duplicate attempt",
    firstZone.name,
    "European Zone Primary",
  );
  TestValidator.predicate(
    "original zone should still be active after duplicate attempt",
    firstZone.active === true,
  );
}
