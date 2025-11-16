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
 * Validate that a platform admin can clear the primary region association of an
 * existing shipping zone.
 *
 * Business context
 *
 * - Shipping zones are configuration records that may optionally be associated to
 *   a primary region setting through shopping_mall_region_setting_id.
 * - Platform admins may need to disassociate a shipping zone from a region
 *   without deleting either record. This is modeled as setting the FK to null.
 *
 * Scenario
 *
 * 1. Join as a platform admin so that all shoppingMall/platformAdmin APIs can be
 *    called on the shared connection (the join call will inject Authorization
 *    header automatically).
 * 2. Create a region configuration (Region A) via
 *    shoppingMall.platformAdmin.regionSettings.create.
 * 3. Create a shipping zone via
 *    shoppingMall.platformAdmin.shippingZoneSettings.create that references
 *    Region A through shopping_mall_region_setting_id.
 * 4. Call shippingMall.platformAdmin.shippingZoneSettings.update using the
 *    shipping zone's business code as shippingZoneCode and an IUpdate body
 *    that:
 *
 *    - Sets shopping_mall_region_setting_id explicitly to null
 *    - Omits name, description, and active so they are preserved.
 * 5. Assert that the updated response:
 *
 *    - Is a valid IShoppingMallShippingZoneSetting
 *    - Has the same id and code as the original shipping zone
 *    - Has the same active flag as the original shipping zone
 *    - Has primaryRegion now undefined (previously it was defined)
 *    - Has an updated_at value different from the original shipping zone.
 */
export async function test_api_shipping_zone_update_clear_primary_region_association(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (auth.platformAdmin.join)
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
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a region configuration (Region A)
  const regionBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert<IShoppingMallRegionSetting>(region);

  // 3. Create a shipping zone that references Region A
  const zoneBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    shopping_mall_region_setting_id: region.id,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;

  const createdZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      { body: zoneBody },
    );
  typia.assert<IShoppingMallShippingZoneSetting>(createdZone);

  // Sanity checks before update
  TestValidator.predicate(
    "created shipping zone has primaryRegion defined",
    createdZone.primaryRegion !== undefined,
  );
  TestValidator.equals(
    "created shipping zone primaryRegion.id matches region.id",
    createdZone.primaryRegion?.id,
    region.id,
  );

  const originalId = createdZone.id;
  const originalCode = createdZone.code;
  const originalActive = createdZone.active;
  const originalUpdatedAt = createdZone.updated_at;

  // 4. Update the shipping zone to clear primary region association by
  //    setting shopping_mall_region_setting_id to null and leaving other
  //    fields omitted so they remain unchanged.
  const updateBody = {
    shopping_mall_region_setting_id: null,
  } satisfies IShoppingMallShippingZoneSetting.IUpdate;

  const updatedZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.update(
      connection,
      {
        shippingZoneCode: originalCode,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallShippingZoneSetting>(updatedZone);

  // 5. Business validations
  TestValidator.equals(
    "shipping zone id must remain unchanged after clearing region",
    updatedZone.id,
    originalId,
  );
  TestValidator.equals(
    "shipping zone code must remain unchanged after clearing region",
    updatedZone.code,
    originalCode,
  );
  TestValidator.equals(
    "shipping zone active flag must remain unchanged after clearing region",
    updatedZone.active,
    originalActive,
  );

  TestValidator.predicate(
    "primaryRegion should be cleared (undefined) after setting FK to null",
    updatedZone.primaryRegion === undefined,
  );

  TestValidator.predicate(
    "updated_at should change after clearing primary region association",
    updatedZone.updated_at !== originalUpdatedAt,
  );
}
