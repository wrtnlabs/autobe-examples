import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";

/**
 * Validate platform admin ability to update policy setting effective window,
 * and rejection of logically invalid windows.
 *
 * Business purpose:
 *
 * - Platform administrators manage policy setting profiles that control platform
 *   behavior (cancellation, refund, etc.). These profiles can be constrained by
 *   an effective time window.
 * - This test verifies that admins can safely adjust the effective window forward
 *   in time, and that attempts to configure an invalid window where the end
 *   precedes the start are rejected by business rules.
 *
 * Steps:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join and rely on
 *    the SDK to attach its access token to the connection.
 * 2. Create a policy setting profile via POST
 *    /shoppingMall/platformAdmin/policySettings with a valid effective window
 *    and active=true.
 * 3. Update the policy via PUT
 *    /shoppingMall/platformAdmin/policySettings/{policySettingCode} to move the
 *    effective window forward in time (still effective_from < effective_to) and
 *    assert that:
 *
 *    - The response is a valid IShoppingMallPolicySetting.
 *    - The code remains unchanged.
 *    - Effective_from and effective_to match the request payload.
 *    - Updated_at has advanced compared to the created record.
 * 4. Attempt to update the same policy with an invalid window where effective_to
 *    is before effective_from and assert that the backend rejects the request
 *    as a business rule violation using TestValidator.error.
 *
 * This test focuses purely on business semantics (valid vs invalid effective
 * windows) and does not attempt to test type-level validation.
 */
export async function test_api_policy_setting_update_effective_window_rules(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (authentication bootstrap)
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    { body: joinBody },
  );
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a policy setting profile with a valid effective window
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const initialFrom = new Date(now.getTime() + oneDayMs).toISOString();
  const initialTo = new Date(now.getTime() + 2 * oneDayMs).toISOString();

  const createBody = {
    code: `policy_${RandomGenerator.alphaNumeric(10)}`,
    name: "Default Cancellation Policy",
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_payload: JSON.stringify({ cancelWindowHours: 24 }),
    active: true,
    effective_from: initialFrom,
    effective_to: initialTo,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const createdPolicy =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallPolicySetting>(createdPolicy);

  // Basic field equality validation
  TestValidator.equals(
    "created policy code matches input",
    createdPolicy.code,
    createBody.code,
  );
  TestValidator.equals(
    "created policy name matches input",
    createdPolicy.name,
    createBody.name,
  );
  TestValidator.equals(
    "created policy category matches input",
    createdPolicy.category,
    createBody.category,
  );
  TestValidator.equals(
    "created policy effective_from matches input",
    createdPolicy.effective_from,
    createBody.effective_from ?? null,
  );
  TestValidator.equals(
    "created policy effective_to matches input",
    createdPolicy.effective_to,
    createBody.effective_to ?? null,
  );

  const beforeUpdateUpdatedAt = createdPolicy.updated_at;

  // 3. Update the policy with a new valid effective window (move forward)
  const validUpdateFrom = new Date(now.getTime() + 3 * oneDayMs).toISOString();
  const validUpdateTo = new Date(now.getTime() + 5 * oneDayMs).toISOString();

  const updateBodyValid = {
    effective_from: validUpdateFrom,
    effective_to: validUpdateTo,
  } satisfies IShoppingMallPolicySetting.IUpdate;

  const updatedPolicy =
    await api.functional.shoppingMall.platformAdmin.policySettings.update(
      connection,
      {
        policySettingCode: createdPolicy.code,
        body: updateBodyValid,
      },
    );
  typia.assert<IShoppingMallPolicySetting>(updatedPolicy);

  // Verify code is unchanged and window matches the update payload
  TestValidator.equals(
    "updated policy code is unchanged",
    updatedPolicy.code,
    createdPolicy.code,
  );
  TestValidator.equals(
    "updated policy effective_from matches valid update",
    updatedPolicy.effective_from,
    updateBodyValid.effective_from ?? null,
  );
  TestValidator.equals(
    "updated policy effective_to matches valid update",
    updatedPolicy.effective_to,
    updateBodyValid.effective_to ?? null,
  );

  // updated_at should have advanced
  TestValidator.notEquals(
    "updated_at should change after successful update",
    updatedPolicy.updated_at,
    beforeUpdateUpdatedAt,
  );

  // 4. Attempt to set an invalid effective window: effective_to before effective_from
  const invalidFrom = new Date(now.getTime() + 7 * oneDayMs).toISOString();
  const invalidTo = new Date(now.getTime() + 6 * oneDayMs).toISOString();

  const updateBodyInvalid = {
    effective_from: invalidFrom,
    effective_to: invalidTo,
  } satisfies IShoppingMallPolicySetting.IUpdate;

  await TestValidator.error(
    "invalid effective window should be rejected",
    async () => {
      await api.functional.shoppingMall.platformAdmin.policySettings.update(
        connection,
        {
          policySettingCode: createdPolicy.code,
          body: updateBodyInvalid,
        },
      );
    },
  );
}
