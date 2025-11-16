import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";

/**
 * Validate activation and deactivation toggling of a shopping mall policy
 * setting profile by a platform administrator.
 *
 * Business context
 *
 * - Platform administrators define policy setting profiles (e.g., cancellation,
 *   refund) in `shopping_mall_policy_settings`, each identified by a stable
 *   `code`.
 * - They must be able to enable (`active = true`) or disable (`active = false`)
 *   these profiles over time without changing identity fields like `id`,
 *   `code`, or `created_at`.
 * - Each modification should update `updated_at` so that changes are auditable.
 *
 * Scenario steps
 *
 * 1. Join as a new platform administrator using POST /auth/platformAdmin/join.
 *
 *    - Use a randomly generated but valid IShoppingMallPlatformAdminJoin.IRequest.
 *    - After this call, the SDK automatically injects the admin access token into
 *         the shared connection, so subsequent calls execute as this admin.
 * 2. Create a new policy setting profile using POST
 *    /shoppingMall/platformAdmin/policySettings.
 *
 *    - Build an IShoppingMallPolicySetting.ICreate body with:
 *
 *         - `code`: unique string (e.g., based on RandomGenerator.alphaNumeric).
 *         - `name`: random paragraph or name.
 *         - `category`: some arbitrary business category string, e.g. "cancellation".
 *         - `description`: random paragraph or null.
 *         - `config_payload`: some JSON-ish text or null.
 *         - `active`: false (explicitly) to start from a deactivated profile.
 *         - `effective_from` and `effective_to`: either null for unconstrained or omit.
 *    - Capture the created IShoppingMallPolicySetting entity.
 * 3. Toggle activation ON via PUT
 *    /shoppingMall/platformAdmin/policySettings/{policySettingCode}.
 *
 *    - Call api.functional.shoppingMall.platformAdmin.policySettings.update with:
 *
 *         - `policySettingCode`: the `code` field from the created entity.
 *         - `body`: IShoppingMallPolicySetting.IUpdate containing only `active: true`.
 *    - Validate response with typia.assert.
 *    - Using TestValidator:
 *
 *         - Ensure `id` and `code` match the original entity.
 *         - Ensure `name`, `category`, `description`, `config_payload`, `effective_from`,
 *                   and `effective_to` all match the original entity, since we
 *                   did not specify them in the update.
 *         - Ensure `active` is true.
 *         - Ensure `created_at` equals the original `created_at`.
 *         - Ensure `updated_at` differs from the original `updated_at`.
 * 4. Toggle activation OFF via another PUT call to the same endpoint.
 *
 *    - Call api.functional.shoppingMall.platformAdmin.policySettings.update with:
 *
 *         - Same `policySettingCode`.
 *         - `body`: IShoppingMallPolicySetting.IUpdate containing only `active: false`.
 *    - Validate response with typia.assert.
 *    - Using TestValidator:
 *
 *         - Ensure `id` and `code` still match the original entity.
 *         - Ensure `name`, `category`, `description`, `config_payload`, `effective_from`,
 *                   and `effective_to` still match the original entity.
 *         - Ensure `active` is now false.
 *         - Ensure `created_at` still matches the original `created_at`.
 *         - Ensure new `updated_at` differs from both the original and first-update
 *                   values.
 */
export async function test_api_policy_setting_update_activation_and_deactivation(
  connection: api.IConnection,
) {
  // 1. Join as platform administrator to obtain an authenticated connection
  const joinRequest = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create an initial inactive policy setting profile
  const policyCode = `policy_${RandomGenerator.alphaNumeric(12)}`;
  const createBody = {
    code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: JSON.stringify({ windowHours: 24, allowPartial: true }),
    active: false,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const created: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Snapshot original state for later comparisons
  const originalId = created.id;
  const originalCode = created.code;
  const originalName = created.name;
  const originalCategory = created.category;
  const originalDescription = created.description ?? null;
  const originalConfigPayload = created.config_payload ?? null;
  const originalEffectiveFrom = created.effective_from ?? null;
  const originalEffectiveTo = created.effective_to ?? null;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // Sanity check on initial active state
  TestValidator.equals(
    "initial policy should be inactive",
    created.active,
    false,
  );

  // 3. Toggle activation ON (active: true)
  const activateBody = {
    active: true,
  } satisfies IShoppingMallPolicySetting.IUpdate;

  const activated: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.update(
      connection,
      {
        policySettingCode: originalCode,
        body: activateBody,
      },
    );
  typia.assert(activated);

  // Validate identity stability and field preservation after activation
  TestValidator.equals(
    "id must remain the same after activation",
    activated.id,
    originalId,
  );
  TestValidator.equals(
    "code must remain the same after activation",
    activated.code,
    originalCode,
  );
  TestValidator.equals(
    "name must remain unchanged after activation",
    activated.name,
    originalName,
  );
  TestValidator.equals(
    "category must remain unchanged after activation",
    activated.category,
    originalCategory,
  );
  TestValidator.equals(
    "description must remain unchanged after activation",
    activated.description ?? null,
    originalDescription,
  );
  TestValidator.equals(
    "config_payload must remain unchanged after activation",
    activated.config_payload ?? null,
    originalConfigPayload,
  );
  TestValidator.equals(
    "effective_from must remain unchanged after activation",
    activated.effective_from ?? null,
    originalEffectiveFrom,
  );
  TestValidator.equals(
    "effective_to must remain unchanged after activation",
    activated.effective_to ?? null,
    originalEffectiveTo,
  );
  TestValidator.equals(
    "created_at must remain unchanged after activation",
    activated.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "active flag must be true after activation update",
    activated.active,
    true,
  );
  TestValidator.notEquals(
    "updated_at must change after activation update",
    activated.updated_at,
    originalUpdatedAt,
  );

  const activatedUpdatedAt = activated.updated_at;

  // 4. Toggle activation OFF (active: false)
  const deactivateBody = {
    active: false,
  } satisfies IShoppingMallPolicySetting.IUpdate;

  const deactivated: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.update(
      connection,
      {
        policySettingCode: originalCode,
        body: deactivateBody,
      },
    );
  typia.assert(deactivated);

  // Validate identity stability and field preservation after deactivation
  TestValidator.equals(
    "id must remain the same after deactivation",
    deactivated.id,
    originalId,
  );
  TestValidator.equals(
    "code must remain the same after deactivation",
    deactivated.code,
    originalCode,
  );
  TestValidator.equals(
    "name must remain unchanged after deactivation",
    deactivated.name,
    originalName,
  );
  TestValidator.equals(
    "category must remain unchanged after deactivation",
    deactivated.category,
    originalCategory,
  );
  TestValidator.equals(
    "description must remain unchanged after deactivation",
    deactivated.description ?? null,
    originalDescription,
  );
  TestValidator.equals(
    "config_payload must remain unchanged after deactivation",
    deactivated.config_payload ?? null,
    originalConfigPayload,
  );
  TestValidator.equals(
    "effective_from must remain unchanged after deactivation",
    deactivated.effective_from ?? null,
    originalEffectiveFrom,
  );
  TestValidator.equals(
    "effective_to must remain unchanged after deactivation",
    deactivated.effective_to ?? null,
    originalEffectiveTo,
  );
  TestValidator.equals(
    "created_at must remain unchanged after deactivation",
    deactivated.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "active flag must be false after deactivation update",
    deactivated.active,
    false,
  );
  TestValidator.notEquals(
    "updated_at must differ from original after deactivation",
    deactivated.updated_at,
    originalUpdatedAt,
  );
  TestValidator.notEquals(
    "updated_at must differ between activation and deactivation updates",
    deactivated.updated_at,
    activatedUpdatedAt,
  );
}
