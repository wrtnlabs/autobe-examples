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

export async function test_api_cancellation_policy_update_nonexistent_code_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized session
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.alphaNumeric(10),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Prepare a non-existent cancellation policy code
  const nonexistentCode: string = `NON_EXISTENT_CODE_${RandomGenerator.alphaNumeric(16)}`;

  // 3. Build a valid update payload
  const updateBody = {
    name: "Updated Cancellation Policy Name",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: false,
    max_hours_after_payment: 48,
    config_payload: JSON.stringify({ allowSameDay: true }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.IUpdate;

  // 4. Attempt to update a non-existent policy and expect an error
  await TestValidator.error(
    "update with non-existent cancellation policy code must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.cancellationPolicies.update(
        connection,
        {
          cancellationPolicyCode: nonexistentCode,
          body: updateBody,
        },
      );
    },
  );

  // 5. Create a policy with the same code and ensure it succeeds
  const createBody = {
    code: nonexistentCode,
    name: "New Cancellation Policy After Failed Update",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: JSON.stringify({ windowHours: 72 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const created: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: createBody },
    );

  typia.assert<IShoppingMallCancellationPolicy>(created);

  // 6. Verify that the created policy uses the same code and basic fields match the request
  TestValidator.equals(
    "created cancellation policy code must match the requested business code",
    created.code,
    nonexistentCode,
  );

  TestValidator.equals(
    "created cancellation policy name must match the create request name",
    created.name,
    createBody.name,
  );

  TestValidator.equals(
    "created cancellation policy allow_cancellation_before_shipment must match",
    created.allow_cancellation_before_shipment,
    createBody.allow_cancellation_before_shipment,
  );

  TestValidator.equals(
    "created cancellation policy allow_partial_cancellation must match",
    created.allow_partial_cancellation,
    createBody.allow_partial_cancellation,
  );
}
