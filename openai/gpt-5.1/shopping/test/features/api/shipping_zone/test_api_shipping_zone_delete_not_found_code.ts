import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallShippingZoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingZoneSetting";

export async function test_api_shipping_zone_delete_not_found_code(
  connection: api.IConnection,
) {
  // 1. Join as a platform administrator so that subsequent admin-only
  //    configuration endpoints (regionSettings, shippingZoneSettings, erase)
  //    are authorized. The SDK will automatically install the access token
  //    into connection.headers.Authorization.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: "P@ssw0rd!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a baseline region configuration that can be referenced by
  //    shipping zones. Optional metadata fields are set explicitly to null
  //    where nullable to exercise DTO optional handling.
  const regionCreateBody = {
    code: `REGION_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    iso_country_code: null,
    currency_code: null,
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 3. Create a control shipping zone that must conceptually remain
  //    unaffected by a failed delete attempt using a non-existent code.
  const controlZoneCreateBody = {
    code: `ZONE_CONTROL_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    shopping_mall_region_setting_id: region.id,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;

  const controlZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      {
        body: controlZoneCreateBody,
      },
    );
  typia.assert(controlZone);

  // 4. Prepare a shippingZoneCode value that is virtually guaranteed not to
  //    correspond to any existing zone. Use a deterministic prefix plus a
  //    long random suffix. For extra safety, assert it differs from the
  //    control zone's code.
  const nonExistingCodePrefix = "NON_EXISTING_ZONE_";
  const nonExistingCodeSuffix = RandomGenerator.alphaNumeric(16);
  const nonExistingCode = `${nonExistingCodePrefix}${nonExistingCodeSuffix}`;

  TestValidator.notEquals(
    "non-existing shipping zone code must differ from control zone code",
    controlZone.code,
    nonExistingCode,
  );

  // 5. Attempt to delete using the non-existent shipping zone code.
  //    We expect the backend to reject this with an error (conceptually a
  //    not-found), so the call is wrapped in TestValidator.error. We do not
  //    assert specific HTTP status codes or error payload structures, per
  //    global E2E testing constraints.
  await TestValidator.error(
    "erasing a non-existent shipping zone should fail without affecting existing zones",
    async () => {
      await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.erase(
        connection,
        {
          shippingZoneCode: nonExistingCode,
        },
      );
    },
  );
}
