import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

export async function test_api_region_settings_update_not_found_for_unknown_region_code(
  connection: api.IConnection,
) {
  // 1. Arrange: register a platform admin so that subsequent calls
  //    run in an authenticated platformAdmin context.
  const joinRequest = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinRequest,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
  TestValidator.predicate(
    "platform admin session must be active",
    admin.isActive === true,
  );

  // 2. Choose a regionCode that is guaranteed to not exist.
  const unknownRegionCode = `UNKNOWN_REGION_${RandomGenerator.alphaNumeric(16)}`;

  // 3. Build a valid update payload for region settings.
  const updateBody = {
    name: `Non-existent Region ${RandomGenerator.name(1)}`,
    iso_country_code: "ZZ", // clearly non-real ISO code but syntactically valid
    currency_code: "ZZZ", // syntactically valid ISO-4217-style pattern
    timezone: "Etc/UTC",
    active: true,
  } satisfies IShoppingMallRegionSetting.IUpdate;

  // 4. Act & Assert: calling update for non-existent regionCode must yield
  //    a not-found HTTP error (e.g., 404). We only validate the status code
  //    via TestValidator.httpError and rely on the SDK throwing HttpError.
  await TestValidator.httpError(
    "updating unknown region must result in not-found error",
    404,
    async () => {
      await api.functional.shoppingMall.platformAdmin.regionSettings.update(
        connection,
        {
          regionCode: unknownRegionCode,
          body: updateBody,
        },
      );
    },
  );

  // 5. Repeat the same failing request to confirm idempotent not-found
  //    behavior. Same request with same regionCode must also yield not-found.
  await TestValidator.httpError(
    "repeating update on same unknown region must still be not-found",
    404,
    async () => {
      await api.functional.shoppingMall.platformAdmin.regionSettings.update(
        connection,
        {
          regionCode: unknownRegionCode,
          body: updateBody,
        },
      );
    },
  );
}
