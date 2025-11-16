import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";

/**
 * Validate creation of a refund policy linked to region and policy setting
 * profiles.
 *
 * ## Business goal
 *
 * Ensure that a platform administrator can:
 *
 * 1. Join the platform and obtain an authorized admin session.
 * 2. Create a policy setting profile with a unique business code in the "refund"
 *    category.
 * 3. Create a region configuration with a unique region code (e.g., "EU_MARKET").
 * 4. Create a refund policy that:
 *
 *    - Uses a unique refund policy code,
 *    - Sets core refund behavior flags and thresholds,
 *    - Links to the previously created region and policy setting profile via their
 *         business codes,
 *    - And is active in a coherent effective period window.
 * 5. Receive an IShoppingMallRefundPolicy DTO that echoes these inputs, including
 *    the regionCode and policySettingCode associations.
 *
 * ## Test process
 *
 * 1. Platform admin join
 *
 *    - Call POST /auth/platformAdmin/join using
 *         api.functional.auth.platformAdmin.join.
 *    - Use IShoppingMallPlatformAdminJoin.IRequest as the body.
 *    - Validate the response as IShoppingMallPlatformAdmin.IAuthorized via
 *         typia.assert.
 *    - Rely on SDK to set Authorization header on the connection.
 * 2. Create policy setting profile
 *
 *    - Prepare an IShoppingMallPolicySetting.ICreate body with:
 *
 *         - Code: unique alpha-numeric string, e.g., "refund_policy_profile_...".
 *         - Name: random human-friendly label.
 *         - Category: "refund".
 *         - Description: optional descriptive paragraph.
 *         - Config_payload: optional JSON string (kept simple for the test).
 *         - Active: true.
 *         - Effective_from/effective_to: coherent window using ISO date-time strings.
 *    - Call api.functional.shoppingMall.platformAdmin.policySettings.create.
 *    - Assert response type using typia.assert<IShoppingMallPolicySetting>().
 *    - Business validation with TestValidator:
 *
 *         - Code in response equals the requested code.
 *         - Category equals "refund".
 *         - Active is true.
 * 3. Create region configuration
 *
 *    - Prepare an IShoppingMallRegionSetting.ICreate body with:
 *
 *         - Code: unique region code, e.g., "EU_MARKET_...".
 *         - Name: random region name.
 *         - Iso_country_code: a reasonable ISO-like code (e.g., "EU").
 *         - Currency_code: e.g., "EUR".
 *         - Timezone: e.g., "Europe/Berlin".
 *         - Active: true.
 *    - Call api.functional.shoppingMall.platformAdmin.regionSettings.create.
 *    - Assert response type via typia.assert<IShoppingMallRegionSetting>().
 *    - Business validation with TestValidator:
 *
 *         - Code in response equals the requested code.
 *         - Active is true.
 * 4. Create refund policy linked to region and policy setting
 *
 *    - Prepare timestamps for effectiveFrom and effectiveUntil using new
 *         Date().toISOString() and a later time (e.g., +5 days).
 *    - Prepare an IShoppingMallRefundPolicy.ICreate body with:
 *
 *         - Code: unique refund policy code.
 *         - Name: short paragraph name.
 *         - Description: optional paragraph description.
 *         - AllowFullRefund: true.
 *         - AllowPartialRefund: true.
 *         - RefundWindowDays: non-negative int32 (e.g., 30).
 *         - MaxRefundRate: a number between 0 and 1 (e.g., 0.8).
 *         - RequireManualApprovalOverAmount: positive number (e.g., 100000).
 *         - ConfigurationPayload: simple JSON text string.
 *         - IsActive: true.
 *         - EffectiveFrom/effectiveUntil: coherent window computed previously.
 *         - RegionCode: regionSetting.code from step 3.
 *         - PolicySettingCode: policySetting.code from step 2.
 *    - Call api.functional.shoppingMall.platformAdmin.refundPolicies.create.
 *    - Assert response type via typia.assert<IShoppingMallRefundPolicy>().
 * 5. Validate refund policy response
 *
 *    - Using TestValidator.equals and TestValidator.predicate, ensure that:
 *
 *         - RefundPolicy.code equals the requested refund policy code.
 *         - RefundPolicy.name equals the requested name.
 *         - RefundPolicy.isActive is true.
 *         - RefundPolicy.allowFullRefund and allowPartialRefund echo input.
 *         - RefundPolicy.maxDaysAfterDelivery equals refundWindowDays.
 *         - RefundPolicy.maxRefundRate equals the requested maxRefundRate.
 *         - RefundPolicy.requireAdminApprovalOverAmount equals the requested threshold.
 *         - RefundPolicy.regionCode equals regionSetting.code.
 *         - RefundPolicy.policySettingCode equals policySetting.code.
 *         - RefundPolicy.effectiveFrom and effectiveUntil are defined and match the input
 *                   strings.
 */
export async function test_api_refund_policy_creation_with_region_and_policy_setting_links(
  connection: api.IConnection,
) {
  // 1. Platform admin join
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create policy setting profile
  const policySettingCode = `refund_profile_${RandomGenerator.alphaNumeric(10)}`;
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveTo = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const policySettingBody = {
    code: policySettingCode,
    name: `Refund Policy Profile ${RandomGenerator.name(1)}`,
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_payload: JSON.stringify({ kind: "basic_refund_profile" }),
    active: true,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: policySettingBody,
      },
    );
  typia.assert<IShoppingMallPolicySetting>(policySetting);

  TestValidator.equals(
    "policy setting code should echo input",
    policySetting.code,
    policySettingCode,
  );
  TestValidator.equals(
    "policy setting category should be 'refund'",
    policySetting.category,
    "refund",
  );
  TestValidator.predicate(
    "policy setting should be active",
    policySetting.active === true,
  );

  // 3. Create region configuration
  const regionCode = `EU_MARKET_${RandomGenerator.alphaNumeric(6)}`;
  const regionBody = {
    code: regionCode,
    name: `Region ${RandomGenerator.name(1)}`,
    iso_country_code: "EU",
    currency_code: "EUR",
    timezone: "Europe/Berlin",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const regionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: regionBody,
      },
    );
  typia.assert<IShoppingMallRegionSetting>(regionSetting);

  TestValidator.equals(
    "region code should echo input",
    regionSetting.code,
    regionCode,
  );
  TestValidator.predicate(
    "region should be active",
    regionSetting.active === true,
  );

  // 4. Create refund policy linked to region and policy setting
  const refundPolicyCode = `refund_policy_${RandomGenerator.alphaNumeric(10)}`;
  const refundWindowDays = 30;
  const maxRefundRate = 0.8;
  const requireManualApprovalOverAmount = 100000;

  const refundEffectiveFrom = new Date().toISOString();
  const refundEffectiveUntil = new Date(
    new Date().getTime() + 5 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const refundPolicyBody = {
    code: refundPolicyCode,
    name: `Refund Policy ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays,
    maxRefundRate,
    requireManualApprovalOverAmount,
    configurationPayload: JSON.stringify({ tier: "standard", version: 1 }),
    isActive: true,
    effectiveFrom: refundEffectiveFrom,
    effectiveUntil: refundEffectiveUntil,
    regionCode: regionSetting.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      {
        body: refundPolicyBody,
      },
    );
  typia.assert<IShoppingMallRefundPolicy>(refundPolicy);

  // 5. Validate refund policy response
  TestValidator.equals(
    "refund policy code should echo input",
    refundPolicy.code,
    refundPolicyCode,
  );
  TestValidator.equals(
    "refund policy name should echo input",
    refundPolicy.name,
    refundPolicyBody.name,
  );
  TestValidator.predicate(
    "refund policy should be active",
    refundPolicy.isActive === true,
  );
  TestValidator.predicate(
    "refund policy should allow full refund",
    refundPolicy.allowFullRefund === true,
  );
  TestValidator.predicate(
    "refund policy should allow partial refund",
    refundPolicy.allowPartialRefund === true,
  );
  TestValidator.equals(
    "refund policy maxDaysAfterDelivery should match refundWindowDays",
    refundPolicy.maxDaysAfterDelivery,
    refundWindowDays,
  );
  TestValidator.equals(
    "refund policy maxRefundRate should echo input",
    refundPolicy.maxRefundRate,
    maxRefundRate,
  );
  TestValidator.equals(
    "refund policy requireAdminApprovalOverAmount should echo input",
    refundPolicy.requireAdminApprovalOverAmount,
    requireManualApprovalOverAmount,
  );
  TestValidator.equals(
    "refund policy regionCode should link created region",
    refundPolicy.regionCode,
    regionSetting.code,
  );
  TestValidator.equals(
    "refund policy policySettingCode should link created policy setting",
    refundPolicy.policySettingCode,
    policySetting.code,
  );
  TestValidator.equals(
    "refund policy effectiveFrom should echo input",
    refundPolicy.effectiveFrom,
    refundEffectiveFrom,
  );
  TestValidator.equals(
    "refund policy effectiveUntil should echo input",
    refundPolicy.effectiveUntil,
    refundEffectiveUntil,
  );
}
