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

export async function test_api_cancellation_policy_update_region_and_policy_setting_links(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized session
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(admin);

  // 2. Create an initial cancellation policy without region/policy associations
  const initialPolicyCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: false,
    max_hours_after_payment: typia.random<number & tags.Type<"int32">>(),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: new Date().toISOString(),
    effective_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const initialPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: initialPolicyCreateBody,
      },
    );
  typia.assert(initialPolicy);

  // Sanity checks on initial policy
  TestValidator.equals(
    "created policy code should match input code",
    initialPolicy.code,
    initialPolicyCreateBody.code,
  );
  TestValidator.equals(
    "initial region association should be null",
    initialPolicy.region_setting,
    null,
  );
  TestValidator.equals(
    "initial policy setting association should be null",
    initialPolicy.policy_setting,
    null,
  );

  // 3. Subcase A: update non-association fields only, omit region_code and policy_setting_code
  const updateBodyA = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    allow_cancellation_before_shipment: false,
    allow_partial_cancellation: true,
    active: false,
  } satisfies IShoppingMallCancellationPolicy.IUpdate;

  const updatedA: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.update(
      connection,
      {
        cancellationPolicyCode: initialPolicy.code,
        body: updateBodyA,
      },
    );
  typia.assert(updatedA);

  // Validate changed fields
  TestValidator.equals(
    "policy name should be updated",
    updatedA.name,
    updateBodyA.name,
  );
  TestValidator.equals(
    "policy description should be updated",
    updatedA.description ?? null,
    updateBodyA.description ?? null,
  );
  TestValidator.equals(
    "allow_cancellation_before_shipment flag should be updated",
    updatedA.allow_cancellation_before_shipment,
    updateBodyA.allow_cancellation_before_shipment,
  );
  TestValidator.equals(
    "allow_partial_cancellation flag should be updated",
    updatedA.allow_partial_cancellation,
    updateBodyA.allow_partial_cancellation,
  );
  TestValidator.equals(
    "active flag should be updated",
    updatedA.active,
    updateBodyA.active,
  );

  // Validate unchanged associations and business code
  TestValidator.equals(
    "policy code should remain unchanged after non-association update",
    updatedA.code,
    initialPolicy.code,
  );
  TestValidator.equals(
    "region association should remain unchanged when not updated",
    updatedA.region_setting,
    initialPolicy.region_setting,
  );
  TestValidator.equals(
    "policy setting association should remain unchanged when not updated",
    updatedA.policy_setting,
    initialPolicy.policy_setting,
  );

  // 4. Subcase B: explicitly clear region_code and policy_setting_code with null
  const updateBodyB = {
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.IUpdate;

  const updatedB: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.update(
      connection,
      {
        cancellationPolicyCode: initialPolicy.code,
        body: updateBodyB,
      },
    );
  typia.assert(updatedB);

  // Associations should be null after explicit clearing
  TestValidator.equals(
    "region association should be null after explicit clearing",
    updatedB.region_setting,
    null,
  );
  TestValidator.equals(
    "policy setting association should be null after explicit clearing",
    updatedB.policy_setting,
    null,
  );

  // Other fields should remain as in updatedA
  TestValidator.equals(
    "name should remain as last updated when only association codes are cleared",
    updatedB.name,
    updatedA.name,
  );
  TestValidator.equals(
    "description should remain as last updated when only association codes are cleared",
    updatedB.description ?? null,
    updatedA.description ?? null,
  );
  TestValidator.equals(
    "allow_cancellation_before_shipment flag should remain as last updated",
    updatedB.allow_cancellation_before_shipment,
    updatedA.allow_cancellation_before_shipment,
  );
  TestValidator.equals(
    "allow_partial_cancellation flag should remain as last updated",
    updatedB.allow_partial_cancellation,
    updatedA.allow_partial_cancellation,
  );
  TestValidator.equals(
    "active flag should remain as last updated",
    updatedB.active,
    updatedA.active,
  );
  TestValidator.equals(
    "policy code should remain unchanged after clearing associations",
    updatedB.code,
    initialPolicy.code,
  );
}
