import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate not-found behavior for region settings detail lookup by unknown
 * region code.
 *
 * Business goal: Ensure that the platform admin region-settings detail endpoint
 * does not silently succeed or leak data when a non-existent region code is
 * requested. Instead, it must respond with a failure (typically 404 Not Found)
 * while still allowing normal success behavior for valid region codes.
 *
 * High-level flow:
 *
 * 1. Register a platform admin (POST /auth/platformAdmin/join) to obtain an
 *    authenticated admin session; the SDK manages the Authorization header.
 * 2. Seed the system with a single valid region setting using POST
 *    /shoppingMall/platformAdmin/regionSettings so that we have at least one
 *    real regionCode for comparison.
 * 3. Verify that GET /shoppingMall/platformAdmin/regionSettings/{regionCode}
 *    succeeds for the newly created region's code and returns a
 *    IShoppingMallRegionSetting object.
 * 4. Invoke the same GET endpoint using a clearly non-existent regionCode and
 *    assert that the call fails by throwing an HttpError using
 *    TestValidator.error. Do not assert on HTTP status code or error payload
 *    fields; only the fact that it errors is validated.
 *
 * Type/DTO usage:
 *
 * - Use IShoppingMallPlatformAdminJoin.IRequest as the request body for the join
 *   call via `satisfies` without an explicit type annotation variable.
 * - Use IShoppingMallRegionSetting.ICreate as the request body for the create
 *   regionSettings call, again via `satisfies`.
 * - The region detail endpoint returns IShoppingMallRegionSetting; assert it via
 *   typia.assert.
 *
 * Data generation rules:
 *
 * - Use typia.random<string & tags.Format<"email">>() for admin email.
 * - Use RandomGenerator.name() for the admin name.
 * - Use typia.random<string & tags.Format<"uri">>() for href and referrer.
 * - For the region setting, generate a short code such as "REG_" plus a random
 *   alphanumeric suffix, a random name via RandomGenerator.name(), and simple
 *   optional metadata values (like iso_country_code = "KR", currency_code =
 *   "KRW", timezone = "Asia/Seoul").
 *
 * Validation rules:
 *
 * - After join, validate the returned IShoppingMallPlatformAdmin.IAuthorized
 *   object via typia.assert to ensure type correctness.
 * - After creating a region setting, validate the returned
 *   IShoppingMallRegionSetting via typia.assert and sanity-check that the code
 *   in the response matches the requested code using TestValidator.equals with
 *   a descriptive title.
 * - When fetching the existing region by code, typia.assert the result and again
 *   confirm the code matches.
 * - For the unknown regionCode call, wrap the failing GET in `await
 *   TestValidator.error("unknown regionCode should fail", async () => { ...
 *   })`. Do not attempt to inspect the HttpError status or payload.
 *
 * Constraints and framework-specific rules:
 *
 * - Do not touch connection.headers directly; rely on the SDK join function to
 *   manage Authorization tokens.
 * - Use `await` on every API call (join, create, at).
 * - Do not add any imports beyond those in the template; use provided api,
 *   RandomGenerator, TestValidator, typia, and tags only.
 * - Do not write tests that intentionally send wrong-typed bodies or omit
 *   required fields.
 */
export async function test_api_region_settings_detail_not_found_for_unknown_region_code(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to establish authenticated context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const joinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "StrongP@ssw0rd",
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Seed one valid region setting
  const regionCodePrefix = "TEST_REGION_";
  const randomSuffix = RandomGenerator.alphaNumeric(8);
  const regionCode = `${regionCodePrefix}${randomSuffix}`;

  const createRegionBody = {
    code: regionCode,
    name: RandomGenerator.name(),
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const createdRegion =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: createRegionBody,
      },
    );
  typia.assert<IShoppingMallRegionSetting>(createdRegion);
  TestValidator.equals(
    "created region code should match request code",
    createdRegion.code,
    regionCode,
  );

  // 3. Verify detail lookup succeeds for the existing region code
  const fetchedRegion =
    await api.functional.shoppingMall.platformAdmin.regionSettings.at(
      connection,
      {
        regionCode,
      },
    );
  typia.assert<IShoppingMallRegionSetting>(fetchedRegion);
  TestValidator.equals(
    "fetched region code should equal created region code",
    fetchedRegion.code,
    regionCode,
  );

  // 4. Call detail endpoint with an obviously unknown region code and expect error
  const unknownRegionCode = "NON_EXISTENT_REGION_CODE_999";

  await TestValidator.error("unknown regionCode should fail", async () => {
    await api.functional.shoppingMall.platformAdmin.regionSettings.at(
      connection,
      {
        regionCode: unknownRegionCode,
      },
    );
  });
}
