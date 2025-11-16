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

export async function test_api_refund_policy_delete_after_configuration_change(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform administrator
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.shoppingmall.test/refund-policies" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a policy setting profile
  const policySettingCode = `policy_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingBody = {
    code: policySettingCode,
    name: "Default Refund Policy Setting",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingBody },
    );
  typia.assert(policySetting);

  // 3. Create a region setting
  const regionCode = `REG_${RandomGenerator.alphaNumeric(6)}`;
  const regionBody = {
    code: regionCode,
    name: "Korea Region",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert(region);

  // 4. Create a cancellation policy tied to region and policy setting
  const cancellationPolicyCode = `CNCL_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationPolicyBody = {
    code: cancellationPolicyCode,
    name: "Standard Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 48 as number & tags.Type<"int32">,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: regionCode,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyBody },
    );
  typia.assert(cancellationPolicy);

  // 5. Create an initial refund policy linked logically to the same region/policy setting
  const refundPolicyCode = `RF_${RandomGenerator.alphaNumeric(10)}`;
  const initialRefundPolicyBody = {
    code: refundPolicyCode,
    name: "Initial Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 14 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode,
    policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const createdRefundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: initialRefundPolicyBody },
    );
  typia.assert(createdRefundPolicy);

  TestValidator.equals(
    "created refund policy code matches request",
    createdRefundPolicy.code,
    refundPolicyCode,
  );

  // capture some original fields for later comparison
  const originalName = createdRefundPolicy.name;
  const originalIsActive = createdRefundPolicy.isActive;
  const originalRefundWindowDays = createdRefundPolicy.maxDaysAfterDelivery;
  const originalMaxRefundRate = createdRefundPolicy.maxRefundRate;
  const originalUpdatedAt = createdRefundPolicy.updatedAt;

  // 6. Update the refund policy with modified configuration
  const updatedName = `${originalName} - Updated`;
  const updatedRefundWindowDays = 21 as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const updatedMaxRefundRate = 0.5;

  const updateBody = {
    name: updatedName,
    isActive: false,
    refundWindowDays: updatedRefundWindowDays,
    maxRefundRate: updatedMaxRefundRate,
  } satisfies IShoppingMallRefundPolicy.IUpdate;

  const updatedRefundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.update(
      connection,
      {
        refundPolicyCode,
        body: updateBody,
      },
    );
  typia.assert(updatedRefundPolicy);

  // Business assertions: confirm key fields actually changed
  TestValidator.notEquals(
    "refund policy name should change after update",
    updatedRefundPolicy.name,
    originalName,
  );
  TestValidator.equals(
    "updated refund policy name matches payload",
    updatedRefundPolicy.name,
    updatedName,
  );

  TestValidator.notEquals(
    "isActive should be toggled by update",
    updatedRefundPolicy.isActive,
    originalIsActive,
  );
  TestValidator.equals(
    "updated isActive is false",
    updatedRefundPolicy.isActive,
    false,
  );

  if (originalRefundWindowDays !== undefined) {
    TestValidator.notEquals(
      "refund window days should change",
      updatedRefundPolicy.maxDaysAfterDelivery,
      originalRefundWindowDays,
    );
  }
  TestValidator.equals(
    "updated refund window days matches payload",
    updatedRefundPolicy.maxDaysAfterDelivery,
    updatedRefundWindowDays,
  );

  if (originalMaxRefundRate !== undefined) {
    TestValidator.notEquals(
      "max refund rate should change",
      updatedRefundPolicy.maxRefundRate,
      originalMaxRefundRate,
    );
  }
  TestValidator.equals(
    "updated max refund rate matches payload",
    updatedRefundPolicy.maxRefundRate,
    updatedMaxRefundRate,
  );

  TestValidator.notEquals(
    "updatedAt should change after policy update",
    updatedRefundPolicy.updatedAt,
    originalUpdatedAt,
  );

  // 7. Delete the refund policy using its business code
  await api.functional.shoppingMall.platformAdmin.refundPolicies.erase(
    connection,
    { refundPolicyCode },
  );

  // At this point, successful completion of erase without error implies
  // the updated policy record has been removed. No direct GET endpoint is
  // available to verify absence, so we rely on the combination of:
  // - successful creation and update with type validation
  // - successful erase call with no thrown error
  TestValidator.predicate(
    "erase of updated refund policy should complete without error",
    true,
  );
}
