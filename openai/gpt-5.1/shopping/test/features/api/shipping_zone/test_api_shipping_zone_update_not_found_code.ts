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
 * Validate that updating a non-existent shipping zone returns a not-found style
 * error and does not create or modify any shipping zone.
 *
 * Business context: Platform administrators manage shipping zones identified by
 * a unique business code (shippingZoneCode). The update endpoint must treat
 * this code as a strict identifier: if no zone exists for the provided code,
 * the operation must fail with clear not-found semantics and must not create a
 * new record or mutate existing zones.
 *
 * Test steps:
 *
 * 1. Join as a platform admin so that subsequent platformAdmin endpoints are
 *    authorized.
 * 2. Create a control region configuration (optional but provides realistic
 *    context).
 * 3. Create a valid shipping zone with a randomly generated business code that
 *    will be distinct from the fake code used in the failing update.
 * 4. Call the update endpoint with a deliberately non-existent shippingZoneCode
 *    (e.g., "NON_EXISTENT_ZONE") and a valid
 *    IShoppingMallShippingZoneSetting.IUpdate body.
 * 5. Assert that the call fails with an HttpError whose status is a 4xx not-found
 *    style error (e.g., 404) using TestValidator.httpError.
 * 6. Rely on the fact that we never issue an update for the real zone's code to
 *    reason that existing records are not mutated as a side-effect of the
 *    failed update.
 */
export async function test_api_shipping_zone_update_not_found_code(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a control region configuration (optional but realistic)
  const regionBody = {
    code: "REGION_" + RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert(region);

  // 3. Create a valid control shipping zone with a random, unique code
  const controlZoneCode = "ZONE_" + RandomGenerator.alphaNumeric(8);
  const zoneBody = {
    code: controlZoneCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    shopping_mall_region_setting_id: region.id,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;

  const controlZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      { body: zoneBody },
    );
  typia.assert(controlZone);

  // 4. Attempt to update a non-existent shipping zone code
  const nonExistentCode = "NON_EXISTENT_ZONE";

  const updateBody = {
    name: "Updated Name For Non-Existent Zone",
    description:
      "This update should never succeed because the zone code does not exist.",
    active: false,
    shopping_mall_region_setting_id: region.id,
  } satisfies IShoppingMallShippingZoneSetting.IUpdate;

  // 5. Expect not-found style HttpError when updating non-existent zone
  await TestValidator.httpError(
    "update non-existent shipping zone should be not found",
    404,
    async () => {
      await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.update(
        connection,
        {
          shippingZoneCode: nonExistentCode,
          body: updateBody,
        },
      );
    },
  );

  // 6. Business reasoning: control zone was never targeted for update, so it
  // must remain unchanged. We cannot re-fetch it due to missing read endpoint
  // in the SDK snapshot, but we can at least assert the original data shape is
  // correct and treat the absence of any successful update as evidence that no
  // mutation has occurred in this flow.
  typia.assert<IShoppingMallShippingZoneSetting>(controlZone);

  // Additional sanity: ensure non-existent code does not accidentally collide
  // with the control zone code.
  TestValidator.notEquals(
    "non-existent zone code must differ from control zone code",
    nonExistentCode,
    controlZone.code,
  );
}
