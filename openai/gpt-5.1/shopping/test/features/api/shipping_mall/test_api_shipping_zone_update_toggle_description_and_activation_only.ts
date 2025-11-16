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
 * Validate updating only description and activation flag on a shipping zone.
 *
 * Business flow:
 *
 * 1. Platform admin joins (auth) to obtain an authorized session.
 * 2. Create a primary region configuration.
 * 3. Create an initial active shipping zone bound to that region with a non-empty
 *    description.
 * 4. Update the shipping zone by code, changing only description and active (to
 *    false).
 * 5. Verify that id, code, and primaryRegion stay the same, while description and
 *    active change, and updated_at is newer.
 */
export async function test_api_shipping_zone_update_toggle_description_and_activation_only(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a primary region configuration
  const regionBody = {
    code: `REGION_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: regionBody,
      },
    );
  typia.assert(region);

  // 3. Create an initial shipping zone bound to that region
  const initialDescription = RandomGenerator.paragraph({ sentences: 5 });
  const zoneCreateBody = {
    code: `ZONE_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    description: initialDescription,
    active: true,
    shopping_mall_region_setting_id: region.id,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;

  const originalZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      {
        body: zoneCreateBody,
      },
    );
  typia.assert(originalZone);

  // Sanity-check that primaryRegion summary is properly populated
  TestValidator.predicate(
    "original zone primaryRegion should exist",
    originalZone.primaryRegion !== undefined,
  );
  if (originalZone.primaryRegion !== undefined) {
    TestValidator.equals(
      "original zone primaryRegion.id should match region.id",
      originalZone.primaryRegion.id,
      region.id,
    );
    TestValidator.equals(
      "original zone primaryRegion.code should match region.code",
      originalZone.primaryRegion.code,
      region.code,
    );
    TestValidator.equals(
      "original zone primaryRegion.name should match region.name",
      originalZone.primaryRegion.name,
      region.name,
    );
    TestValidator.equals(
      "original zone primaryRegion.active should match region.active",
      originalZone.primaryRegion.active,
      region.active,
    );
  }

  // 4. Update the shipping zone by code, changing only description and active
  const updatedDescription = RandomGenerator.paragraph({ sentences: 7 });
  const updateBody = {
    description: updatedDescription,
    active: false,
  } satisfies IShoppingMallShippingZoneSetting.IUpdate;

  const updatedZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.update(
      connection,
      {
        shippingZoneCode: originalZone.code,
        body: updateBody,
      },
    );
  typia.assert(updatedZone);

  // 5. Verify invariants and changes
  TestValidator.equals(
    "shipping zone id should remain unchanged after update",
    updatedZone.id,
    originalZone.id,
  );
  TestValidator.equals(
    "shipping zone code should remain unchanged after update",
    updatedZone.code,
    originalZone.code,
  );

  TestValidator.equals(
    "shipping zone description should be updated",
    updatedZone.description,
    updatedDescription,
  );

  TestValidator.equals(
    "shipping zone active flag should be set to false",
    updatedZone.active,
    false,
  );

  // primaryRegion should remain associated with the same region
  TestValidator.predicate(
    "updated zone primaryRegion should still exist",
    updatedZone.primaryRegion !== undefined,
  );
  if (updatedZone.primaryRegion !== undefined) {
    TestValidator.equals(
      "updated zone primaryRegion.id should still match region.id",
      updatedZone.primaryRegion.id,
      region.id,
    );
    TestValidator.equals(
      "updated zone primaryRegion.code should still match region.code",
      updatedZone.primaryRegion.code,
      region.code,
    );
    TestValidator.equals(
      "updated zone primaryRegion.name should still match region.name",
      updatedZone.primaryRegion.name,
      region.name,
    );
    TestValidator.equals(
      "updated zone primaryRegion.active should still match region.active",
      updatedZone.primaryRegion.active,
      region.active,
    );
  }

  // updated_at should be later than or equal to the original updated_at
  const originalUpdatedAt = new Date(originalZone.updated_at).getTime();
  const updatedUpdatedAt = new Date(updatedZone.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should be newer after update",
    updatedUpdatedAt >= originalUpdatedAt,
  );
}
