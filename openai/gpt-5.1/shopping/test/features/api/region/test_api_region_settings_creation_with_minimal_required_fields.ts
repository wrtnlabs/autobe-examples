import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate creation of a ShoppingMall region setting using only minimal
 * required fields.
 *
 * Business goal:
 *
 * - Ensure a platform administrator can create a new region configuration by
 *   providing only the required fields: `code`, `name`, and `active`.
 * - Verify that omitting optional metadata fields (iso_country_code,
 *   currency_code, timezone) does not trigger validation errors and that the
 *   backend still returns a fully-typed IShoppingMallRegionSetting.
 *
 * High-level flow:
 *
 * 1. Bootstrap an authenticated platform admin session via POST
 *    /auth/platformAdmin/join.
 * 2. Construct a minimal IShoppingMallRegionSetting.ICreate payload containing
 *    only: code, name, active.
 * 3. Call POST /shoppingMall/platformAdmin/regionSettings with the minimal
 *    payload.
 * 4. Validate that:
 *
 *    - The response is a valid IShoppingMallRegionSetting.
 *    - Code, name, and active in the response match the request.
 *    - Server-managed fields (id, created_at, updated_at) are populated and
 *         type-correct (validated by typia.assert).
 *    - Optional metadata fields are either omitted or null in a way consistent with
 *         their optional/nullable typing.
 */
export async function test_api_region_settings_creation_with_minimal_required_fields(
  connection: api.IConnection,
) {
  // 1. Join as a new platform administrator to obtain an authorized session.
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(platformAdmin);

  // 2. Prepare minimal region creation payload with only required fields.
  const regionCodeBase = RandomGenerator.alphaNumeric(8);
  const regionCode = `REGION_${regionCodeBase}`;
  const regionName = RandomGenerator.paragraph({ sentences: 2 });
  const regionActive = true;

  const createRegionBody = {
    code: regionCode,
    name: regionName,
    active: regionActive,
  } satisfies IShoppingMallRegionSetting.ICreate;

  // 3. Call region settings creation API.
  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: createRegionBody,
      },
    );
  typia.assert(region);

  // 4. Business validations: ensure echo and basic invariants.
  TestValidator.equals(
    "region code should match input",
    region.code,
    regionCode,
  );

  TestValidator.equals(
    "region name should match input",
    region.name,
    regionName,
  );

  TestValidator.equals(
    "region active flag should match input",
    region.active,
    regionActive,
  );

  // Optional fields behavior is already covered by typia.assert via type
  // contracts; we do not enforce whether they are null or undefined.
}
