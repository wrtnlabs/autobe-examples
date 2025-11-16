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

export async function test_api_refund_policy_update_effective_period_and_activation(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin so subsequent calls are authenticated
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a region configuration to scope policies
  const regionCode = `REGION_${RandomGenerator.alphaNumeric(6)}`;
  const regionCreateBody = {
    code: regionCode,
    name: "Test Region",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert(region);

  // 3. Create an active refund policy setting profile
  const policySettingCode = `REFUND_PROFILE_${RandomGenerator.alphaNumeric(6)}`;
  const policySettingCreateBody = {
    code: policySettingCode,
    name: "Refund Policy Profile",
    category: "refund",
    description: "Profile for refund-related policies",
    config_payload: null,
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreateBody },
    );
  typia.assert(policySetting);

  // 4. Optionally create a cancellation policy using region & policy setting codes
  const cancellationPolicyCode = `CANCEL_${RandomGenerator.alphaNumeric(6)}`;
  const cancellationCreateBody = {
    code: cancellationPolicyCode,
    name: "Test Cancellation Policy",
    description: "Cancellation policy aligned with refund region/profile",
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: null,
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: regionCode,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationCreateBody },
    );
  typia.assert(cancellationPolicy);

  // 5. Create an initial refund policy that is currently active and effective indefinitely
  const refundPolicyCode = `REFUND_${RandomGenerator.alphaNumeric(6)}`;

  const now = new Date();
  const pastFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const refundCreateBody = {
    code: refundPolicyCode,
    name: "Initial Refund Policy",
    description:
      "Initial refund policy that is active and effective indefinitely",
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: undefined,
    isActive: true,
    effectiveFrom: pastFrom,
    effectiveUntil: null,
    regionCode,
    policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const createdPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundCreateBody },
    );
  typia.assert(createdPolicy);

  // 6. Prepare future effective period and deactivation update
  const futureFrom = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureUntil = new Date(
    now.getTime() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const updateBody = {
    isActive: false,
    effectiveFrom: futureFrom,
    effectiveUntil: futureUntil,
  } satisfies IShoppingMallRefundPolicy.IUpdate;

  // 7. Perform the update via PUT /shoppingMall/platformAdmin/refundPolicies/{refundPolicyCode}
  const updated: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.update(
      connection,
      {
        refundPolicyCode: createdPolicy.code,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 8. Validate that effective period and activation flag were updated, while key identifiers remain unchanged
  TestValidator.equals(
    "refund policy isActive toggled to false",
    updated.isActive,
    false,
  );

  TestValidator.equals(
    "refund policy effectiveFrom updated to futureFrom",
    updated.effectiveFrom,
    futureFrom,
  );

  TestValidator.equals(
    "refund policy effectiveUntil updated to futureUntil",
    updated.effectiveUntil,
    futureUntil,
  );

  TestValidator.equals(
    "refund policy code remains unchanged",
    updated.code,
    createdPolicy.code,
  );

  TestValidator.equals(
    "refund policy regionCode remains unchanged",
    updated.regionCode,
    createdPolicy.regionCode,
  );

  TestValidator.equals(
    "refund policy policySettingCode remains unchanged",
    updated.policySettingCode,
    createdPolicy.policySettingCode,
  );
}
