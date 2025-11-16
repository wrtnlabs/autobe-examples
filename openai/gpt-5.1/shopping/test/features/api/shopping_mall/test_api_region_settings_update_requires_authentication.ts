import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Verify that updating region settings requires platform admin authentication.
 *
 * Business goal:
 *
 * - Ensure that PUT /shoppingMall/platformAdmin/regionSettings/{regionCode}
 *   rejects unauthenticated callers, while the same update succeeds for an
 *   authenticated platform admin.
 *
 * Scenario steps:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join to obtain an
 *    authorized admin session (SDK stores the access token into
 *    connection.headers automatically).
 * 2. As the authenticated platform admin, create a baseline region setting via
 *    POST /shoppingMall/platformAdmin/regionSettings.
 * 3. Prepare an update payload that changes multiple mutable fields of the region
 *    (name, iso_country_code, currency_code, timezone, active).
 * 4. Build an unauthenticated connection by cloning the original connection but
 *    with an empty headers object, simulating a client that sends no
 *    Authorization header.
 * 5. Attempt to update the region using the unauthenticated connection and assert
 *    that the call fails via TestValidator.error.
 * 6. Re-run the same update using the authenticated connection and assert that it
 *    succeeds and returns an updated region.
 * 7. Verify that the region code remains unchanged while at least one of the
 *    mutable fields differs from the baseline, proving that only the
 *    authenticated call applied the update.
 */
export async function test_api_region_settings_update_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain an authenticated session.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a baseline region setting as the authenticated admin.
  const regionCreateBody = {
    code: `REGION_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const baselineRegion: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegionSetting>(baselineRegion);

  // 3. Prepare an update payload that changes multiple mutable fields.
  const updateBody = {
    name: `${baselineRegion.name} (updated)`,
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: !baselineRegion.active,
  } satisfies IShoppingMallRegionSetting.IUpdate;

  // 4. Build an unauthenticated connection (no Authorization header).
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt unauthorized update and expect failure.
  await TestValidator.error(
    "unauthenticated region update must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.regionSettings.update(
        unauthenticatedConnection,
        {
          regionCode: baselineRegion.code,
          body: updateBody,
        },
      );
    },
  );

  // 6. Perform the same update with the authenticated connection, expect success.
  const updatedRegion: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.update(
      connection,
      {
        regionCode: baselineRegion.code,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallRegionSetting>(updatedRegion);

  // 7. Business assertions.
  // Code must remain stable.
  TestValidator.equals(
    "region code must remain unchanged after update",
    updatedRegion.code,
    baselineRegion.code,
  );

  // At least one mutable field must differ; we check all of them.
  const anyFieldChanged: boolean =
    updatedRegion.name !== baselineRegion.name ||
    updatedRegion.iso_country_code !== baselineRegion.iso_country_code ||
    updatedRegion.currency_code !== baselineRegion.currency_code ||
    updatedRegion.timezone !== baselineRegion.timezone ||
    updatedRegion.active !== baselineRegion.active;

  TestValidator.predicate(
    "at least one mutable field must change after authenticated update",
    anyFieldChanged,
  );
}
