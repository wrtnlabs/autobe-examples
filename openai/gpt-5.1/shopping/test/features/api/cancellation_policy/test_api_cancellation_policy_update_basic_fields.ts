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
 * Verify that a platform admin can update basic descriptive and boolean fields
 * of an existing cancellation policy identified by its business code while
 * preserving immutable identity fields and timestamps.
 *
 * Business flow:
 *
 * 1. Join as a platform admin to establish an authenticated session.
 * 2. Create a baseline cancellation policy with a unique code and initial values
 *    for name, description, boolean flags, and timing window.
 * 3. Update the policy via its business code using
 *    IShoppingMallCancellationPolicy.IUpdate to change name, description,
 *    allow_partial_cancellation, and active while leaving other fields
 *    unspecified.
 * 4. Assert that:
 *
 *    - Id and code are unchanged.
 *    - Created_at is unchanged.
 *    - Updated_at has advanced.
 *    - Updated fields reflect new values.
 *    - Unspecified fields remain unchanged.
 */
export async function test_api_cancellation_policy_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: undefined,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a baseline cancellation policy
  const baseCode: string = `CANCEL-${RandomGenerator.alphaNumeric(8)}`;
  const baseName: string = RandomGenerator.paragraph({ sentences: 3 });
  const baseDescription: string = RandomGenerator.paragraph({ sentences: 5 });
  const baseAllowBeforeShipment = true;
  const baseAllowPartial = true;
  const baseMaxHours: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<168>
  >();

  const createBody = {
    code: baseCode,
    name: baseName,
    description: baseDescription,
    allow_cancellation_before_shipment: baseAllowBeforeShipment,
    allow_partial_cancellation: baseAllowPartial,
    max_hours_after_payment: baseMaxHours,
    config_payload: null,
    effective_from: null,
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

  // Capture original immutable and baseline values
  const originalId = created.id;
  const originalCode = created.code;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;
  const originalAllowBeforeShipment =
    created.allow_cancellation_before_shipment;
  const originalAllowPartial = created.allow_partial_cancellation;
  const originalMaxHours = created.max_hours_after_payment;
  const originalRegionSetting = created.region_setting;
  const originalPolicySetting = created.policy_setting;

  // 3. Prepare an update that changes name, description, allow_partial_cancellation and active
  const updatedName: string = `${baseName} (v2)`;
  const updatedDescription: string = RandomGenerator.paragraph({
    sentences: 4,
  });
  const updatedAllowPartial = !originalAllowPartial;
  const updatedActive = !created.active;

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    allow_partial_cancellation: updatedAllowPartial,
    active: updatedActive,
  } satisfies IShoppingMallCancellationPolicy.IUpdate;

  const updated: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.update(
      connection,
      {
        cancellationPolicyCode: created.code,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallCancellationPolicy>(updated);

  // 4. Validate identity invariants
  TestValidator.equals(
    "policy id must remain unchanged",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "policy code must remain unchanged and match path parameter",
    updated.code,
    originalCode,
  );
  TestValidator.equals(
    "created_at timestamp must remain unchanged",
    updated.created_at,
    originalCreatedAt,
  );

  // updated_at must have advanced (allowing for potential clock precision)
  TestValidator.notEquals(
    "updated_at must change after update",
    updated.updated_at,
    originalUpdatedAt,
  );

  // 5. Validate updated fields
  TestValidator.equals("name must be updated", updated.name, updatedName);
  TestValidator.equals(
    "description must be updated",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "allow_partial_cancellation must be toggled",
    updated.allow_partial_cancellation,
    updatedAllowPartial,
  );
  TestValidator.equals(
    "active flag must be updated",
    updated.active,
    updatedActive,
  );

  // 6. Validate that unspecified fields remain unchanged
  TestValidator.equals(
    "allow_cancellation_before_shipment should remain unchanged",
    updated.allow_cancellation_before_shipment,
    originalAllowBeforeShipment,
  );
  TestValidator.equals(
    "max_hours_after_payment should remain unchanged",
    updated.max_hours_after_payment,
    originalMaxHours,
  );
  TestValidator.equals(
    "region_setting should remain unchanged",
    updated.region_setting,
    originalRegionSetting,
  );
  TestValidator.equals(
    "policy_setting should remain unchanged",
    updated.policy_setting,
    originalPolicySetting,
  );
}
