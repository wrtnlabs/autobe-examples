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
 * Ensure shipping zone update rejects invalid primary region reference.
 *
 * Business goal: Validate that when a platform admin attempts to update an
 * existing shipping zone and supplies a shopping_mall_region_setting_id that
 * does not correspond to any existing region configuration, the update
 * operation fails (validation/business error) rather than silently accepting,
 * creating, or ignoring the invalid association. Also confirm that successful
 * updates with valid data still work and preserve the correct region
 * association.
 *
 * High-level workflow:
 *
 * 1. Bootstrap: join a platform admin to obtain an authorized connection.
 * 2. Create a valid region setting (Region A).
 * 3. Create a shipping zone that references Region A as its primary region (via
 *    shopping_mall_region_setting_id in ICreate).
 * 4. Attempt to update the shipping zone using PUT
 *    /shoppingMall/platformAdmin/shippingZoneSettings/{shippingZoneCode} with
 *    an IShoppingMallShippingZoneSetting.IUpdate body whose
 *    shopping_mall_region_setting_id is a random UUID that does not match
 *    Region A.id (and very unlikely to match anything).
 * 5. Expect the update call to fail; capture this behavior using
 *    TestValidator.error to assert that the invalid foreign key is rejected. We
 *    do not check specific status codes, only that an error occurs.
 * 6. After the failed attempt, perform a successful update that changes a benign
 *    field (e.g., name or description) while either keeping the existing region
 *    association (by omitting shopping_mall_region_setting_id) or explicitly
 *    setting it back to Region A.id. Assert that the update returns a zone
 *    whose primaryRegion still matches Region A.
 *
 * Constraints and notes:
 *
 * - Use only the provided SDK functions:
 *
 *   - Api.functional.auth.platformAdmin.join
 *   - Api.functional.shoppingMall.platformAdmin.regionSettings.create
 *   - Api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create
 *   - Api.functional.shoppingMall.platformAdmin.shippingZoneSettings.update
 * - Use IShoppingMallRegionSetting.ICreate for region creation and
 *   IShoppingMallShippingZoneSetting.ICreate / .IUpdate for shipping zone
 *   operations.
 * - Do not test HTTP status codes directly; just assert error vs success with
 *   TestValidator.error for the invalid region update.
 * - Use typia.assert on all successful responses to enforce runtime type
 *   validation.
 * - Avoid any type-bypass techniques (no `as any`, etc.).
 */
export async function test_api_shipping_zone_update_reject_invalid_region_reference(
  connection: api.IConnection,
) {
  // 1. Join a platform admin to obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a valid region setting (Region A)
  const regionCreateBody = {
    code: `REGION_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert(region);

  // 3. Create a shipping zone referencing Region A as primary region
  const zoneCode = `ZONE_${RandomGenerator.alphaNumeric(8)}`;
  const shippingZoneCreateBody = {
    code: zoneCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    shopping_mall_region_setting_id: region.id,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;

  const shippingZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      { body: shippingZoneCreateBody },
    );
  typia.assert(shippingZone);

  // Sanity check: primaryRegion should be present and consistent
  if (shippingZone.primaryRegion !== undefined) {
    TestValidator.equals(
      "created zone primaryRegion id matches region.id",
      shippingZone.primaryRegion.id,
      region.id,
    );
    TestValidator.equals(
      "created zone primaryRegion code matches region.code",
      shippingZone.primaryRegion.code,
      region.code,
    );
  }

  // 4. Attempt to update with a non-existent region id, expect error
  const invalidRegionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "updating shipping zone with non-existent region id must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.update(
        connection,
        {
          shippingZoneCode: zoneCode,
          body: {
            shopping_mall_region_setting_id: invalidRegionId,
          } satisfies IShoppingMallShippingZoneSetting.IUpdate,
        },
      );
    },
  );

  // 5. Perform a successful update that keeps association with Region A
  const updatedName = `${shippingZone.name} (updated)`;
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });

  const updatedZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.update(
      connection,
      {
        shippingZoneCode: zoneCode,
        body: {
          name: updatedName,
          description: updatedDescription,
        } satisfies IShoppingMallShippingZoneSetting.IUpdate,
      },
    );
  typia.assert(updatedZone);

  // Validate that benign fields were updated
  TestValidator.equals(
    "shipping zone name updated after valid update",
    updatedZone.name,
    updatedName,
  );
  TestValidator.equals(
    "shipping zone description updated after valid update",
    updatedZone.description,
    updatedDescription,
  );

  // Validate that primaryRegion is still associated with Region A
  if (updatedZone.primaryRegion !== undefined) {
    TestValidator.equals(
      "updated zone primaryRegion id remains Region A id",
      updatedZone.primaryRegion.id,
      region.id,
    );
    TestValidator.equals(
      "updated zone primaryRegion code remains Region A code",
      updatedZone.primaryRegion.code,
      region.code,
    );
  }
}
