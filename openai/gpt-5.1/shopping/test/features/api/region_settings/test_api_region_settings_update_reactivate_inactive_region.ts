import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Reactivate an inactive ShoppingMall region configuration via update.
 *
 * Business goal
 *
 * - Ensure that a platform administrator can create a region with `active=false`
 *   and later reactivate it by calling the update endpoint with `active=true`.
 * - Confirm that reactivation behaves as an in-place update: identifiers stay
 *   stable while status and timestamps change appropriately.
 *
 * Steps
 *
 * 1. Join as a new platform admin, which also establishes an authenticated session
 *    on the shared `connection`.
 * 2. Create a new region setting using a unique business `code`, with
 *    `active=false` and realistic metadata (country, currency, timezone).
 * 3. Update that same region by `code`, flipping `active` from `false` to `true`
 *    and adjusting the `name` and some metadata fields.
 * 4. Assert that:
 *
 *    - The original region is created with `active=false`.
 *    - The updated region keeps the same `id` and `code`.
 *    - `active` is now `true`.
 *    - `updated_at` has changed (or at least is not earlier than before).
 *    - `deleted_at` remains null/undefined, meaning the region is logically present
 *         and not retired.
 */
export async function test_api_region_settings_update_reactivate_inactive_region(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin so that subsequent calls are authorized.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create an inactive region with a unique business code.
  const regionCode: string = RandomGenerator.alphaNumeric(8);
  const createBody = {
    code: regionCode,
    name: `Inactive Region ${RandomGenerator.name(1)}`,
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: false,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const created: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Basic creation validations.
  TestValidator.equals(
    "created region code must match request",
    created.code,
    regionCode,
  );
  TestValidator.equals(
    "created region must be inactive initially",
    created.active,
    false,
  );
  TestValidator.predicate(
    "created_at and updated_at must be non-empty",
    () => created.created_at.length > 0 && created.updated_at.length > 0,
  );

  const originalId: string & tags.Format<"uuid"> = created.id;
  const originalCreatedAt: string & tags.Format<"date-time"> =
    created.created_at;
  const originalUpdatedAt: string & tags.Format<"date-time"> =
    created.updated_at;

  // 3. Reactivate the region via update (flip active=true and adjust metadata).
  const updatedName = `Reactivated Region ${RandomGenerator.name(1)}`;
  const updateBody = {
    name: updatedName,
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.IUpdate;

  const updated: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.update(
      connection,
      {
        regionCode,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Validate that reactivation behaved as an in-place update.
  TestValidator.equals(
    "updated region must preserve id",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "updated region must preserve code",
    updated.code,
    regionCode,
  );
  TestValidator.equals(
    "updated region must now be active",
    updated.active,
    true,
  );

  TestValidator.equals(
    "updated region name must reflect update body",
    updated.name,
    updatedName,
  );

  TestValidator.predicate(
    "updated_at should be changed or at least not earlier than original",
    () => updated.updated_at >= originalUpdatedAt,
  );

  // deleted_at should remain null/undefined for an active, non-retired region.
  TestValidator.predicate(
    "deleted_at must remain null or undefined after reactivation",
    () => updated.deleted_at === null || updated.deleted_at === undefined,
  );
}
