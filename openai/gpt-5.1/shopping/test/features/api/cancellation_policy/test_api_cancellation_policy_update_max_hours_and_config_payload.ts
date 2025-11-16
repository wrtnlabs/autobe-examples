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
 * Verify updating timing and configuration fields of a cancellation policy.
 *
 * Business goal: A platform admin should be able to iteratively tune a
 * cancellation policy’s numeric timing constraint (max_hours_after_payment) and
 * its serialized configuration payload (config_payload) without recreating the
 * policy. This test covers increasing and then decreasing the allowed hours
 * after payment and switching the advanced configuration payload between
 * different JSON strings and null.
 *
 * Steps:
 *
 * 1. Register a platform administrator (POST /auth/platformAdmin/join).
 *
 *    - Use random but valid email and URLs for href and referrer.
 *    - After join, the SDK wires token into the connection automatically.
 *    - Assert that the returned IShoppingMallPlatformAdmin.IAuthorized object is
 *         structurally valid.
 * 2. Create a baseline cancellation policy (POST
 *    /shoppingMall/platformAdmin/cancellationPolicies).
 *
 *    - Build a body that satisfies IShoppingMallCancellationPolicy.ICreate:
 *
 *         - Code: random unique string.
 *         - Name: random short text.
 *         - Description: random or null.
 *         - Allow_cancellation_before_shipment: true.
 *         - Allow_partial_cancellation: true.
 *         - Max_hours_after_payment: some initial int32 value, e.g. 24.
 *         - Config_payload: JSON string, e.g. JSON.stringify({ version: 1, rule: "simple"
 *                   }).
 *         - Effective_from/effective_to: optional; you can omit or set null.
 *         - Active: true.
 *         - Region_code/policy_setting_code: optional; can be omitted or null.
 *    - Call create and assert the response as IShoppingMallCancellationPolicy.
 *    - Capture immutable fields: id, code, created_at.
 *    - Also capture the original updated_at for later comparison.
 *    - Validate with TestValidator.equals/predicate that the returned record
 *         reflects the creation input for max_hours_after_payment and
 *         config_payload.
 * 3. First update: increase max_hours_after_payment and change config_payload.
 *
 *    - Prepare an IShoppingMallCancellationPolicy.IUpdate body with:
 *
 *         - Max_hours_after_payment: larger value than original, e.g. 48.
 *         - Config_payload: different JSON string, e.g. JSON.stringify({ version: 2,
 *                   rule: "more_strict" }).
 *         - Do not include other fields so they remain unchanged.
 *    - Invoke PUT /shoppingMall/platformAdmin/cancellationPolicies/{code} via
 *         api.functional.shoppingMall.platformAdmin.cancellationPolicies.update,
 *         passing cancellationPolicyCode from the created policy.
 *    - Assert the response and validate:
 *
 *         - Id and code are unchanged.
 *         - Created_at is unchanged.
 *         - Max_hours_after_payment equals the new larger value.
 *         - Config_payload equals the new JSON string.
 *         - Updated_at is different from and later than the original updated_at (parse as
 *                   Date and compare).
 * 4. Second update: decrease max_hours_after_payment and null out config_payload.
 *
 *    - Prepare another IShoppingMallCancellationPolicy.IUpdate body with:
 *
 *         - Max_hours_after_payment: smaller value, e.g. 12.
 *         - Config_payload: null, to clear advanced rules.
 *    - Call the same update endpoint again with the same code.
 *    - Assert and validate:
 *
 *         - Id, code, and created_at remain unchanged.
 *         - Max_hours_after_payment equals the new smaller value.
 *         - Config_payload is strictly null.
 *         - Updated_at has advanced again compared to the previous updated_at (monotonic
 *                   increase).
 * 5. Business rule coverage:
 *
 *    - Demonstrates that the system supports both increasing and decreasing the
 *         timing window while staying within int32 numeric constraints.
 *    - Confirms that config_payload can be set to a complex JSON string and later
 *         cleared to null.
 *    - Confirms that immutable fields (id, code, created_at) are not affected by
 *         update operations and that updated_at reflects the latest change.
 */
export async function test_api_cancellation_policy_update_max_hours_and_config_payload(
  connection: api.IConnection,
) {
  // 1. Register platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create baseline cancellation policy
  const initialMaxHours = 24 as number & tags.Type<"int32">;
  const initialConfig = JSON.stringify({ version: 1, rule: "simple" });

  const createBody = {
    code: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: initialMaxHours,
    config_payload: initialConfig,
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const created =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallCancellationPolicy>(created);

  const originalId = created.id;
  const originalCode = created.code;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  TestValidator.equals(
    "created policy max_hours_after_payment should match initial value",
    created.max_hours_after_payment,
    initialMaxHours,
  );
  TestValidator.equals(
    "created policy config_payload should match initial JSON",
    created.config_payload,
    initialConfig,
  );

  // 3. First update: increase max_hours_after_payment and change config_payload
  const increasedMaxHours = 48 as number & tags.Type<"int32">;
  const updatedConfig = JSON.stringify({ version: 2, rule: "more_strict" });

  const firstUpdateBody = {
    max_hours_after_payment: increasedMaxHours,
    config_payload: updatedConfig,
  } satisfies IShoppingMallCancellationPolicy.IUpdate;

  const firstUpdated =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.update(
      connection,
      {
        cancellationPolicyCode: originalCode,
        body: firstUpdateBody,
      },
    );
  typia.assert<IShoppingMallCancellationPolicy>(firstUpdated);

  TestValidator.equals(
    "first update keeps id stable",
    firstUpdated.id,
    originalId,
  );
  TestValidator.equals(
    "first update keeps code stable",
    firstUpdated.code,
    originalCode,
  );
  TestValidator.equals(
    "first update keeps created_at stable",
    firstUpdated.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "first update sets max_hours_after_payment to increased value",
    firstUpdated.max_hours_after_payment,
    increasedMaxHours,
  );
  TestValidator.equals(
    "first update sets config_payload to updated JSON",
    firstUpdated.config_payload,
    updatedConfig,
  );

  const firstUpdatedAtDate = new Date(firstUpdated.updated_at);
  const originalUpdatedAtDate = new Date(originalUpdatedAt);
  TestValidator.predicate(
    "first update should advance updated_at",
    firstUpdatedAtDate.getTime() >= originalUpdatedAtDate.getTime(),
  );

  // 4. Second update: decrease max_hours_after_payment and null out config_payload
  const decreasedMaxHours = 12 as number & tags.Type<"int32">;

  const secondUpdateBody = {
    max_hours_after_payment: decreasedMaxHours,
    config_payload: null,
  } satisfies IShoppingMallCancellationPolicy.IUpdate;

  const secondUpdated =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.update(
      connection,
      {
        cancellationPolicyCode: originalCode,
        body: secondUpdateBody,
      },
    );
  typia.assert<IShoppingMallCancellationPolicy>(secondUpdated);

  TestValidator.equals(
    "second update keeps id stable",
    secondUpdated.id,
    originalId,
  );
  TestValidator.equals(
    "second update keeps code stable",
    secondUpdated.code,
    originalCode,
  );
  TestValidator.equals(
    "second update keeps created_at stable",
    secondUpdated.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "second update sets max_hours_after_payment to decreased value",
    secondUpdated.max_hours_after_payment,
    decreasedMaxHours,
  );
  TestValidator.equals(
    "second update clears config_payload to null",
    secondUpdated.config_payload,
    null,
  );

  const secondUpdatedAtDate = new Date(secondUpdated.updated_at);
  TestValidator.predicate(
    "second update should advance updated_at again",
    secondUpdatedAtDate.getTime() >= firstUpdatedAtDate.getTime(),
  );
}
