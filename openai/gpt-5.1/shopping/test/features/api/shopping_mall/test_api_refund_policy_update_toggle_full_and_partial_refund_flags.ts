import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Toggle full and partial refund flags on an existing refund policy.
 *
 * Business workflow validated by this test:
 *
 * 1. A platform administrator joins the platform and obtains an authorized
 *    session.
 * 2. The admin creates a region setting used to scope policies.
 * 3. The admin creates a policy setting profile that can be referenced by refund
 *    policies.
 * 4. The admin defines a cancellation policy referencing the region and policy
 *    setting, to simulate a realistic configuration landscape.
 * 5. The admin creates a refund policy with allowFullRefund=false and
 *    allowPartialRefund=true, referencing the same region and policy setting.
 * 6. The admin updates the refund policy via PUT
 *    /shoppingMall/platformAdmin/refundPolicies/{refundPolicyCode}, flipping
 *    the flags so that allowFullRefund=true and allowPartialRefund=false.
 * 7. The test asserts that the response is a valid IShoppingMallRefundPolicy and
 *    that the boolean flags and key identity fields have the expected values
 *    after the update.
 */
export async function test_api_refund_policy_update_toggle_full_and_partial_refund_flags(
  connection: api.IConnection,
) {
  // 1. Platform admin join/authentication
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create region setting
  const regionCode = `REGION_${RandomGenerator.alphaNumeric(8)}`;
  const regionCreateBody = {
    code: regionCode,
    name: `Region ${RandomGenerator.name(1)}`,
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert<IShoppingMallRegionSetting>(region);
  TestValidator.equals(
    "created region uses requested business code",
    region.code,
    regionCode,
  );

  // 3. Create policy setting profile
  const policySettingCode = `POLICY_${RandomGenerator.alphaNumeric(8)}`;
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const effectiveTo = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const policySettingCreateBody = {
    code: policySettingCode,
    name: `Refund Policy Profile ${RandomGenerator.name(1)}`,
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_payload: JSON.stringify({
      kind: "refund_profile",
      version: 1,
    }),
    active: true,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreateBody },
    );
  typia.assert<IShoppingMallPolicySetting>(policySetting);
  TestValidator.equals(
    "policy setting code should match input",
    policySetting.code,
    policySettingCode,
  );

  // 4. Create cancellation policy referencing region and policy setting
  const cancellationPolicyCode = `CANC_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationCreateBody = {
    code: cancellationPolicyCode,
    name: `Cancellation ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: JSON.stringify({
      type: "standard_cancellation",
      graceHours: 24,
    }),
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    active: true,
    region_code: regionCode,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationCreateBody },
    );
  typia.assert<IShoppingMallCancellationPolicy>(cancellationPolicy);
  TestValidator.equals(
    "cancellation policy code should match input",
    cancellationPolicy.code,
    cancellationPolicyCode,
  );

  // 5. Create refund policy with initial flags: full=false, partial=true
  const refundPolicyCode = `REFUND_${RandomGenerator.alphaNumeric(8)}`;
  const refundCreateBody = {
    code: refundPolicyCode,
    name: `Refund ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allowFullRefund: false,
    allowPartialRefund: true,
    refundWindowDays: 30 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 0.8,
    requireManualApprovalOverAmount: 500,
    configurationPayload: JSON.stringify({
      scenario: "initial",
      note: "partial refunds only",
    }),
    isActive: true,
    effectiveFrom,
    effectiveUntil: effectiveTo,
    regionCode,
    policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const createdRefundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundCreateBody },
    );
  typia.assert<IShoppingMallRefundPolicy>(createdRefundPolicy);

  TestValidator.equals(
    "created refund policy code should equal requested code",
    createdRefundPolicy.code,
    refundPolicyCode,
  );
  TestValidator.equals(
    "initial allowFullRefund should be false",
    createdRefundPolicy.allowFullRefund,
    false,
  );
  TestValidator.equals(
    "initial allowPartialRefund should be true",
    createdRefundPolicy.allowPartialRefund,
    true,
  );

  // 6. Update refund policy: flip flags (full=true, partial=false)
  const updateBody = {
    allowFullRefund: true,
    allowPartialRefund: false,
  } satisfies IShoppingMallRefundPolicy.IUpdate;

  const updatedRefundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.update(
      connection,
      {
        refundPolicyCode,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallRefundPolicy>(updatedRefundPolicy);

  // 7. Validate updated flags and invariant fields
  TestValidator.equals(
    "updated refund policy code should remain unchanged",
    updatedRefundPolicy.code,
    createdRefundPolicy.code,
  );
  TestValidator.equals(
    "updated allowFullRefund should be true",
    updatedRefundPolicy.allowFullRefund,
    true,
  );
  TestValidator.equals(
    "updated allowPartialRefund should be false",
    updatedRefundPolicy.allowPartialRefund,
    false,
  );

  TestValidator.equals(
    "policy id should remain stable across update",
    updatedRefundPolicy.id,
    createdRefundPolicy.id,
  );
  TestValidator.equals(
    "isActive should remain unchanged after update",
    updatedRefundPolicy.isActive,
    createdRefundPolicy.isActive,
  );
}
