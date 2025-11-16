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

export async function test_api_refund_policy_delete_basic_success_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a region configuration
  const regionCode = `REGION_${RandomGenerator.alphaNumeric(8)}`;
  const regionBody = {
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
      {
        body: regionBody,
      },
    );
  typia.assert(region);
  TestValidator.equals(
    "region code should match request",
    region.code,
    regionCode,
  );

  // 3. Create a policy setting profile
  const policySettingCode = `POLICY_${RandomGenerator.alphaNumeric(8)}`;
  const nowIso = new Date().toISOString();
  const policyBody = {
    code: policySettingCode,
    name: `Refund Policy Setting ${RandomGenerator.name(1)}`,
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: JSON.stringify({ type: "refund", version: 1 }),
    active: true,
    effective_from: nowIso,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: policyBody,
      },
    );
  typia.assert(policySetting);
  TestValidator.equals(
    "policy setting code should match request",
    policySetting.code,
    policySettingCode,
  );
  TestValidator.equals(
    "policy setting category should be refund",
    policySetting.category,
    "refund",
  );

  // 4. Create a cancellation policy aligned with region and policy setting
  const cancellationCode = `CANCEL_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationBody = {
    code: cancellationCode,
    name: `Cancellation Policy ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 72,
    config_payload: JSON.stringify({ graceHours: 24 }),
    effective_from: nowIso,
    effective_to: null,
    active: true,
    region_code: regionCode,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: cancellationBody,
      },
    );
  typia.assert(cancellationPolicy);
  TestValidator.equals(
    "cancellation policy code should match request",
    cancellationPolicy.code,
    cancellationCode,
  );

  // 5. Create the refund policy that will be deleted
  const refundPolicyCode = `REFUND_${RandomGenerator.alphaNumeric(8)}`;
  const refundBody = {
    code: refundPolicyCode,
    name: `Refund Policy ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: JSON.stringify({
      region: regionCode,
      policySetting: policySettingCode,
    }),
    isActive: true,
    effectiveFrom: nowIso,
    effectiveUntil: null,
    regionCode,
    policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      {
        body: refundBody,
      },
    );
  typia.assert(refundPolicy);
  TestValidator.equals(
    "refund policy code should match request",
    refundPolicy.code,
    refundPolicyCode,
  );

  // 6. Delete the refund policy by its business code
  await api.functional.shoppingMall.platformAdmin.refundPolicies.erase(
    connection,
    {
      refundPolicyCode,
    },
  );

  // 7. If we reached here without error, deletion succeeded for this happy path
  TestValidator.predicate(
    "refund policy delete should complete without throwing",
    true,
  );
}
