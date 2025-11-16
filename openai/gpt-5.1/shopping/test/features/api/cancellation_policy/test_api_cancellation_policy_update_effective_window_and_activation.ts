import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate updating effective window and activation flag of a cancellation
 * policy.
 *
 * Business flow:
 *
 * 1. Platform admin joins (POST /auth/platformAdmin/join) to obtain an authorized
 *    admin session.
 * 2. Admin creates a cancellation policy with a known code, an initial effective
 *    window, and active flag.
 * 3. Admin updates the policy via PUT
 *    /shoppingMall/platformAdmin/cancellationPolicies/{cancellationPolicyCode}
 *    to shift/extend the effective_to date and flip the active flag.
 * 4. Validate that identity fields (id, code, created_at) remain unchanged while
 *    updated_at and the mutable fields (effective_from/effective_to/active)
 *    reflect the new values.
 * 5. Perform a second update that clears effective_to (null) and toggles active
 *    again, confirming that repeated updates preserve identity and correctly
 *    apply new lifecycle settings.
 */
export async function test_api_cancellation_policy_update_effective_window_and_activation(
  connection: api.IConnection,
) {
  // 1. Join platform admin to obtain authorized session
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create initial cancellation policy with known code and window
  const policyCode: string = `cp_${RandomGenerator.alphaNumeric(8)}`;

  const now: Date = new Date();
  const effectiveFrom: string = new Date(now.getTime()).toISOString();
  const effectiveToInitial: string = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const createBody = {
    code: policyCode,
    name: `Policy ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: false,
    max_hours_after_payment: 24,
    config_payload: null,
    effective_from: effectiveFrom,
    effective_to: effectiveToInitial,
    active: false,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const created: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  TestValidator.equals(
    "created policy code should match input code",
    created.code,
    policyCode,
  );
  TestValidator.equals(
    "created policy effective_from should match input",
    created.effective_from,
    effectiveFrom,
  );
  TestValidator.equals(
    "created policy effective_to should match input",
    created.effective_to,
    effectiveToInitial,
  );
  TestValidator.equals(
    "created policy active flag should match input",
    created.active,
    false,
  );

  // 3. First update: extend effective_to and flip active=true
  const effectiveToUpdated: string = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const firstUpdateBody = {
    effective_to: effectiveToUpdated,
    active: true,
  } satisfies IShoppingMallCancellationPolicy.IUpdate;

  const updatedOnce: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.update(
      connection,
      {
        cancellationPolicyCode: policyCode,
        body: firstUpdateBody,
      },
    );
  typia.assert(updatedOnce);

  // Identity fields must remain stable
  TestValidator.equals(
    "policy id should remain unchanged after first update",
    updatedOnce.id,
    created.id,
  );
  TestValidator.equals(
    "policy code should remain unchanged after first update",
    updatedOnce.code,
    created.code,
  );
  TestValidator.equals(
    "created_at should remain unchanged after first update",
    updatedOnce.created_at,
    created.created_at,
  );
  TestValidator.notEquals(
    "updated_at should change after first update",
    updatedOnce.updated_at,
    created.updated_at,
  );

  // Effective window and active flag must reflect update
  TestValidator.equals(
    "effective_from should remain the original value after first update",
    updatedOnce.effective_from,
    created.effective_from,
  );
  TestValidator.equals(
    "effective_to should be updated to extended value",
    updatedOnce.effective_to,
    effectiveToUpdated,
  );
  TestValidator.equals(
    "active flag should be flipped to true",
    updatedOnce.active,
    true,
  );

  // 4. Second update: clear effective_to and toggle active back to false
  const secondUpdateBody = {
    effective_to: null,
    active: false,
  } satisfies IShoppingMallCancellationPolicy.IUpdate;

  const updatedTwice: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.update(
      connection,
      {
        cancellationPolicyCode: policyCode,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedTwice);

  // Identity fields remain stable across second update
  TestValidator.equals(
    "policy id should remain unchanged after second update",
    updatedTwice.id,
    created.id,
  );
  TestValidator.equals(
    "policy code should remain unchanged after second update",
    updatedTwice.code,
    created.code,
  );
  TestValidator.equals(
    "created_at should remain unchanged after second update",
    updatedTwice.created_at,
    created.created_at,
  );
  TestValidator.notEquals(
    "updated_at should change after second update",
    updatedTwice.updated_at,
    updatedOnce.updated_at,
  );

  // Effective window and active flag reflect latest update
  TestValidator.equals(
    "effective_from should still be original value after second update",
    updatedTwice.effective_from,
    created.effective_from,
  );
  TestValidator.equals(
    "effective_to should be cleared to null after second update",
    updatedTwice.effective_to,
    null,
  );
  TestValidator.equals(
    "active flag should be toggled back to false",
    updatedTwice.active,
    false,
  );
}
