import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

export async function test_api_region_settings_creation_with_duplicate_code_conflict(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin so that subsequent calls run under platformAdmin context.
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create the first region with a fixed business code.
  const regionCode = "EU_MARKET_TEST";
  const firstRegionBody = {
    code: regionCode,
    name: "European Market Test",
    iso_country_code: "EU",
    currency_code: "EUR",
    timezone: "Europe/Berlin",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const firstRegion =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: firstRegionBody,
      },
    );
  typia.assert<IShoppingMallRegionSetting>(firstRegion);

  // Sanity check: created region matches request body for key fields.
  TestValidator.equals(
    "created region code should match request code",
    firstRegion.code,
    firstRegionBody.code,
  );
  TestValidator.equals(
    "created region name should match request name",
    firstRegion.name,
    firstRegionBody.name,
  );
  TestValidator.equals(
    "created region active flag should match request active",
    firstRegion.active,
    firstRegionBody.active,
  );

  // Take an in-memory snapshot of the first region for later comparison.
  const snapshotBeforeDuplicate = { ...firstRegion };

  // 3. Try to create another region with the same business code but different metadata.
  const secondRegionBody = {
    code: regionCode,
    name: "European Market Test Duplicate",
    iso_country_code: "EU",
    currency_code: "EUR",
    timezone: "Europe/Paris",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  await TestValidator.error(
    "duplicate region code must be rejected",
    async () => {
      await api.functional.shoppingMall.platformAdmin.regionSettings.create(
        connection,
        {
          body: secondRegionBody,
        },
      );
    },
  );

  // 4. Ensure the original region object we hold in memory remains unchanged.
  TestValidator.equals(
    "original region should remain unchanged after duplicate attempt",
    firstRegion,
    snapshotBeforeDuplicate,
  );
}
