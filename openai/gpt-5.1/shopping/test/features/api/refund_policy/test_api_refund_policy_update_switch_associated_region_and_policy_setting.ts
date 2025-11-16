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
 * Verify that a platform administrator can switch an existing refund policy's
 * associated region and policy setting profile via update, while other
 * configuration fields remain unchanged.
 *
 * Business context: Refund policies are high-level configuration objects that
 * can be scoped by region (IShoppingMallRegionSetting) and reused via policy
 * setting profiles (IShoppingMallPolicySetting). Platform admins must be able
 * to re-bind an existing policy to a new region and/or policy-setting profile
 * without inadvertently changing other refund parameters.
 *
 * Steps:
 *
 * 1. Join a platform admin using POST /auth/platformAdmin/join. This also
 *    configures the SDK connection with an Authorization header for subsequent
 *    platformAdmin endpoints.
 * 2. Create two policy setting profiles via POST
 *    /shoppingMall/platformAdmin/policySettings, both categorized as "refund"
 *    and active. These will act as the initial and updated policySettingCode
 *    references.
 * 3. Create two region settings via POST
 *    /shoppingMall/platformAdmin/regionSettings for different region codes (for
 *    example, "US" and "EU"), both active, so that we can re-scope the refund
 *    policy by regionCode.
 * 4. Create at least one cancellation policy via POST
 *    /shoppingMall/platformAdmin/cancellationPolicies using one of the region
 *    codes and policy setting codes. This step populates a realistic
 *    configuration landscape but is not directly asserted.
 * 5. Create an initial refund policy via POST
 *    /shoppingMall/platformAdmin/refundPolicies where:
 *
 *    - Code and name are random, descriptive strings.
 *    - Description is a random sentence.
 *    - AllowFullRefund and allowPartialRefund are set to true, so behavior is
 *         permissive.
 *    - RefundWindowDays is a small positive int32.
 *    - MaxRefundRate is in the [0,1] range (for example between 0.5 and 1.0).
 *    - RequireManualApprovalOverAmount is a random positive number.
 *    - ConfigurationPayload is a JSON string.
 *    - IsActive is true.
 *    - EffectiveFrom and effectiveUntil are reasonable ISO date-times.
 *    - RegionCode is set to the first region code (e.g., "US").
 *    - PolicySettingCode is set to the first policy setting code.
 *
 *    Capture the entire created IShoppingMallRefundPolicy object to later compare
 *    unchanged fields.
 * 6. Call PUT /shoppingMall/platformAdmin/refundPolicies/{refundPolicyCode} using
 *    api.functional.shoppingMall.platformAdmin.refundPolicies.update with:
 *
 *    - RefundPolicyCode equal to the created policy's code.
 *    - Body as IShoppingMallRefundPolicy.IUpdate containing only: { regionCode:
 *         secondRegion.code, policySettingCode: secondPolicy.code }.
 *
 *    This ensures we are only switching associations, not touching other
 *    properties.
 * 7. Assert with typia.assert that the update response is a valid
 *    IShoppingMallRefundPolicy, and then:
 *
 *    - Verify code equals the original policy code.
 *    - Verify regionCode equals the second region code.
 *    - Verify policySettingCode equals the second policy setting code.
 *    - Verify that name, description, isActive, allowFullRefund, allowPartialRefund,
 *         refundWindowDays, maxRefundRate, requireManualApprovalOverAmount,
 *         configurationPayload, effectiveFrom, effectiveUntil and other scalar
 *         configuration properties are identical to the original policy,
 *         confirming that only the associations changed.
 * 8. Optionally, use TestValidator.notEquals to confirm that the entire original
 *    and updated objects differ (because of association changes), while using
 *    TestValidator.equals for the invariant fields.
 */
export async function test_api_refund_policy_update_switch_associated_region_and_policy_setting(
  connection: api.IConnection,
) {
  // 1. Join platform admin to obtain authorized connection
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create two policy setting profiles for refund
  const policyCode1 = `REFUND_BASE_${RandomGenerator.alphaNumeric(8)}`;
  const policyCode2 = `REFUND_STRICT_${RandomGenerator.alphaNumeric(8)}`;

  const policyCreateCommon = {
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.content({ paragraphs: 2 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies {
    category: string;
    description?: string | null | undefined;
    config_payload?: string | null | undefined;
    active?: boolean | null | undefined;
    effective_from?: (string & tags.Format<"date-time">) | null | undefined;
    effective_to?: (string & tags.Format<"date-time">) | null | undefined;
  };

  const policySetting1: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: {
          code: policyCode1,
          name: "Refund Policy Base",
          category: policyCreateCommon.category,
          description: policyCreateCommon.description,
          config_payload: policyCreateCommon.config_payload,
          active: policyCreateCommon.active,
          effective_from: policyCreateCommon.effective_from,
          effective_to: policyCreateCommon.effective_to,
        } satisfies IShoppingMallPolicySetting.ICreate,
      },
    );
  typia.assert(policySetting1);

  const policySetting2: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: {
          code: policyCode2,
          name: "Refund Policy Strict",
          category: policyCreateCommon.category,
          description: policyCreateCommon.description,
          config_payload: policyCreateCommon.config_payload,
          active: policyCreateCommon.active,
          effective_from: policyCreateCommon.effective_from,
          effective_to: policyCreateCommon.effective_to,
        } satisfies IShoppingMallPolicySetting.ICreate,
      },
    );
  typia.assert(policySetting2);

  // 3. Create two regions (US and EU) that are active
  const regionCode1 = `US_${RandomGenerator.alphaNumeric(4).toUpperCase()}`;
  const regionCode2 = `EU_${RandomGenerator.alphaNumeric(4).toUpperCase()}`;

  const region1: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: {
          code: regionCode1,
          name: "United States Test Region",
          iso_country_code: "US",
          currency_code: "USD",
          timezone: "America/New_York",
          active: true,
        } satisfies IShoppingMallRegionSetting.ICreate,
      },
    );
  typia.assert(region1);

  const region2: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: {
          code: regionCode2,
          name: "European Union Test Region",
          iso_country_code: "EU",
          currency_code: "EUR",
          timezone: "Europe/Berlin",
          active: true,
        } satisfies IShoppingMallRegionSetting.ICreate,
      },
    );
  typia.assert(region2);

  // 4. Background: create a cancellation policy bound to region1 + policySetting1
  const cancellationCode = `CANC_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: {
          code: cancellationCode,
          name: "Default Cancellation for Refund Test",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          allow_cancellation_before_shipment: true,
          allow_partial_cancellation: true,
          max_hours_after_payment: 72,
          config_payload: RandomGenerator.content({ paragraphs: 1 }),
          effective_from: new Date().toISOString(),
          effective_to: null,
          active: true,
          region_code: region1.code,
          policy_setting_code: policySetting1.code,
        } satisfies IShoppingMallCancellationPolicy.ICreate,
      },
    );
  typia.assert(cancellationPolicy);

  // 5. Create an initial refund policy bound to region1 + policySetting1
  const refundCode = `REF_${RandomGenerator.alphaNumeric(10)}`;

  const refundCreateBody = {
    code: refundCode,
    name: "Refund Policy Re-association Test",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    maxRefundRate: 0.9,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: region1.code,
    policySettingCode: policySetting1.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const createdRefundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      {
        body: refundCreateBody,
      },
    );
  typia.assert(createdRefundPolicy);

  // 6. Update refund policy: switch only regionCode and policySettingCode
  const updatedRefundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.update(
      connection,
      {
        refundPolicyCode: createdRefundPolicy.code,
        body: {
          regionCode: region2.code,
          policySettingCode: policySetting2.code,
        } satisfies IShoppingMallRefundPolicy.IUpdate,
      },
    );
  typia.assert(updatedRefundPolicy);

  // 7. Assertions: associations changed, other fields preserved
  TestValidator.equals(
    "refund policy code should remain unchanged",
    updatedRefundPolicy.code,
    createdRefundPolicy.code,
  );

  const expectedRegionCode: string | undefined = region2.code;
  TestValidator.equals(
    "regionCode should be updated to second region",
    updatedRefundPolicy.regionCode,
    expectedRegionCode,
  );

  const expectedPolicySettingCode: string | undefined = policySetting2.code;
  TestValidator.equals(
    "policySettingCode should be updated to second policy setting",
    updatedRefundPolicy.policySettingCode,
    expectedPolicySettingCode,
  );

  // Invariant scalar fields
  TestValidator.equals(
    "name should remain unchanged",
    updatedRefundPolicy.name,
    createdRefundPolicy.name,
  );

  TestValidator.equals(
    "description should remain unchanged",
    updatedRefundPolicy.description ?? null,
    createdRefundPolicy.description ?? null,
  );

  TestValidator.equals(
    "isActive flag should remain unchanged",
    updatedRefundPolicy.isActive,
    createdRefundPolicy.isActive,
  );

  TestValidator.equals(
    "allowFullRefund should remain unchanged",
    updatedRefundPolicy.allowFullRefund,
    createdRefundPolicy.allowFullRefund,
  );

  TestValidator.equals(
    "allowPartialRefund should remain unchanged",
    updatedRefundPolicy.allowPartialRefund,
    createdRefundPolicy.allowPartialRefund,
  );

  TestValidator.equals(
    "maxDaysAfterDelivery (refund window projection) should remain unchanged",
    updatedRefundPolicy.maxDaysAfterDelivery ?? null,
    createdRefundPolicy.maxDaysAfterDelivery ?? null,
  );

  TestValidator.equals(
    "maxRefundRate should remain unchanged",
    updatedRefundPolicy.maxRefundRate ?? null,
    createdRefundPolicy.maxRefundRate ?? null,
  );

  TestValidator.equals(
    "requireAdminApprovalOverAmount should remain unchanged",
    updatedRefundPolicy.requireAdminApprovalOverAmount ?? null,
    createdRefundPolicy.requireAdminApprovalOverAmount ?? null,
  );

  TestValidator.equals(
    "configurationPayload should remain unchanged",
    updatedRefundPolicy.configurationPayload ?? null,
    createdRefundPolicy.configurationPayload ?? null,
  );

  TestValidator.equals(
    "effectiveFrom should remain unchanged",
    updatedRefundPolicy.effectiveFrom ?? null,
    createdRefundPolicy.effectiveFrom ?? null,
  );

  TestValidator.equals(
    "effectiveUntil should remain unchanged",
    updatedRefundPolicy.effectiveUntil ?? null,
    createdRefundPolicy.effectiveUntil ?? null,
  );

  // Additional sanity check: whole object should not be deeply equal
  TestValidator.notEquals(
    "entire refund policy object should differ due to association switching",
    updatedRefundPolicy,
    createdRefundPolicy,
  );
}
