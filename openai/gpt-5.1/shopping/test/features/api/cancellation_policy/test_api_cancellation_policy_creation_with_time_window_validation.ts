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

export async function test_api_cancellation_policy_creation_with_time_window_validation(
  connection: api.IConnection,
) {
  /**
   * 1. Bootstrap a platform admin session so that subsequent cancellation policy
   *    creation calls are authorized.
   */
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "Password123!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  /**
   * 2. Attempt to create a cancellation policy with an invalid effective window
   *    (effective_from > effective_to). This should fail with a business
   *    validation error.
   */
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const invalidEffectiveTo = new Date(now.getTime() + oneDayMs).toISOString();
  const invalidEffectiveFrom = new Date(
    now.getTime() + 2 * oneDayMs,
  ).toISOString();

  const invalidPolicyBody = {
    code: `INVALID_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph(),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: RandomGenerator.paragraph({ sentences: 3 }),
    effective_from: invalidEffectiveFrom,
    effective_to: invalidEffectiveTo,
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  await TestValidator.error(
    "policy creation must fail when effective_from is later than effective_to",
    async () => {
      await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
        connection,
        {
          body: invalidPolicyBody,
        },
      );
    },
  );

  /**
   * 3. Create a valid cancellation policy where effective_from <= effective_to,
   *    expecting successful creation.
   */
  const validEffectiveFrom = now.toISOString();
  const validEffectiveTo = new Date(now.getTime() + oneDayMs).toISOString();

  const validPolicyBody = {
    code: `VALID_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph(),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 48,
    config_payload: RandomGenerator.paragraph({ sentences: 3 }),
    effective_from: validEffectiveFrom,
    effective_to: validEffectiveTo,
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const createdPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: validPolicyBody,
      },
    );
  typia.assert<IShoppingMallCancellationPolicy>(createdPolicy);

  /**
   * 4. Validate that the created policy reflects the requested properties,
   *    especially the effective window and active flag.
   */
  TestValidator.equals(
    "created policy code matches request",
    createdPolicy.code,
    validPolicyBody.code,
  );
  TestValidator.equals(
    "created policy name matches request",
    createdPolicy.name,
    validPolicyBody.name,
  );
  TestValidator.equals(
    "created policy active flag matches request",
    createdPolicy.active,
    validPolicyBody.active,
  );
  TestValidator.equals(
    "created policy effective_from matches request",
    createdPolicy.effective_from ?? null,
    validPolicyBody.effective_from ?? null,
  );
  TestValidator.equals(
    "created policy effective_to matches request",
    createdPolicy.effective_to ?? null,
    validPolicyBody.effective_to ?? null,
  );
}
