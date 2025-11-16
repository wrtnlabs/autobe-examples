import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicyOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyOverview";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallReviewPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewPolicy";

export async function test_api_platform_admin_policy_overview_with_diverse_policies(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (authorization header is managed by SDK)
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create a base policy setting profile
  const policySettingCode = `policy_${RandomGenerator.alphaNumeric(8)}`;
  const policySettingCreate = {
    code: policySettingCode,
    name: "Default Cancellation/Refund/Review/Age Policy Setting",
    category: "platform_composite",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: JSON.stringify({ scope: "global" }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreate },
    );
  typia.assert(policySetting);

  // 3. Create an active cancellation policy linked to the policy setting
  const cancellationCode = `cancel_${RandomGenerator.alphaNumeric(6)}`;
  const cancellationCreate = {
    code: cancellationCode,
    name: "Standard cancellation policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: JSON.stringify({ windowHours: 24 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationCreate },
    );
  typia.assert(cancellationPolicy);

  // 4. Create an active refund policy linked to the same policy setting
  const refundCode = `refund_${RandomGenerator.alphaNumeric(6)}`;
  const refundCreate = {
    code: refundCode,
    name: "Default refund policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: JSON.stringify({ mode: "standard" }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundCreate },
    );
  typia.assert(refundPolicy);

  // 5. Create an active review policy optionally associated with policy setting
  const reviewCode = `review_${RandomGenerator.alphaNumeric(6)}`;
  const reviewCreate = {
    code: reviewCode,
    name: "Standard review policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    max_days_after_delivery_for_review: typia.random<
      number & tags.Type<"int32">
    >(),
    allow_edit_within_days: typia.random<number & tags.Type<"int32">>(),
    auto_hide_report_threshold: typia.random<number & tags.Type<"int32">>(),
    config_payload: JSON.stringify({ moderation: "standard" }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
    shopping_mall_region_setting_id: null,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const reviewPolicy: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: reviewCreate },
    );
  typia.assert(reviewPolicy);

  // 6. Create an active age restriction policy with minimum age and verified age requirement
  const ageCode = `age_${RandomGenerator.alphaNumeric(6)}`;
  const ageCreate = {
    code: ageCode,
    name: "Adult only",
    description: "Adult-only age restriction policy",
    minimum_age_years: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<18>
    >(),
    require_verified_age: true,
    config_payload: JSON.stringify({ scope: "global" }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
    region_setting_id: null,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const agePolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: ageCreate },
    );
  typia.assert(agePolicy);

  // 7. Call policy overview endpoint
  const overview: IShoppingMallPolicyOverview =
    await api.functional.shoppingMall.platformAdmin.policies.overview.at(
      connection,
    );
  typia.assert(overview);

  // 8. Validate policySettings contains created setting summary
  const settingSummary = overview.policySettings.find(
    (s) => s.code === policySetting.code,
  );
  TestValidator.predicate(
    "policySettings should contain the created policy setting",
    settingSummary !== undefined,
  );
  if (settingSummary) {
    TestValidator.equals(
      "policy setting name should match",
      settingSummary.name,
      policySetting.name,
    );
    TestValidator.equals(
      "policy setting category should match",
      settingSummary.category,
      policySetting.category,
    );
    TestValidator.equals(
      "policy setting active flag should be true",
      settingSummary.active,
      true,
    );
  }

  // 9. Validate cancellation policy summary linkage
  const cancellationSummary = overview.cancellationPolicies.find(
    (c) => c.code === cancellationPolicy.code,
  );
  TestValidator.predicate(
    "cancellationPolicies should contain created cancellation policy",
    cancellationSummary !== undefined,
  );
  if (cancellationSummary) {
    TestValidator.equals(
      "cancellation policy name should match",
      cancellationSummary.name,
      cancellationPolicy.name,
    );
    if (cancellationSummary.policySetting) {
      TestValidator.equals(
        "cancellation policySetting code should match",
        cancellationSummary.policySetting.code,
        policySetting.code,
      );
    }
  }

  // 10. Validate refund policy summary linkage
  const refundSummary = overview.refundPolicies.find(
    (r) => r.code === refundPolicy.code,
  );
  TestValidator.predicate(
    "refundPolicies should contain created refund policy",
    refundSummary !== undefined,
  );
  if (refundSummary) {
    TestValidator.equals(
      "refund policy name should match",
      refundSummary.name,
      refundPolicy.name,
    );
    if (refundSummary.policySetting) {
      TestValidator.equals(
        "refund policySetting code should match",
        refundSummary.policySetting.code,
        policySetting.code,
      );
    }
  }

  // 11. Validate review policy summary linkage
  const reviewSummary = overview.reviewPolicies.find(
    (r) => r.code === reviewPolicy.code,
  );
  TestValidator.predicate(
    "reviewPolicies should contain created review policy",
    reviewSummary !== undefined,
  );
  if (reviewSummary) {
    TestValidator.equals(
      "review policy name should match",
      reviewSummary.name,
      reviewPolicy.name,
    );
    if (reviewSummary.policy_setting) {
      TestValidator.equals(
        "review policy policySetting code should match",
        reviewSummary.policy_setting.code,
        policySetting.code,
      );
    }
  }

  // 12. Validate age restriction policy summary linkage
  const ageSummary = overview.ageRestrictionPolicies.find(
    (a) => a.code === agePolicy.code,
  );
  TestValidator.predicate(
    "ageRestrictionPolicies should contain created age restriction policy",
    ageSummary !== undefined,
  );
  if (ageSummary) {
    TestValidator.equals(
      "age restriction policy name should match",
      ageSummary.name,
      agePolicy.name,
    );
    if (ageSummary.policySetting) {
      TestValidator.equals(
        "age restriction policySetting code should match",
        ageSummary.policySetting.code,
        policySetting.code,
      );
    }
  }

  // 13. Ensure arrays for created types have at least one element
  TestValidator.predicate(
    "policySettings array should not be empty",
    overview.policySettings.length > 0,
  );
  TestValidator.predicate(
    "cancellationPolicies array should not be empty",
    overview.cancellationPolicies.length > 0,
  );
  TestValidator.predicate(
    "refundPolicies array should not be empty",
    overview.refundPolicies.length > 0,
  );
  TestValidator.predicate(
    "reviewPolicies array should not be empty",
    overview.reviewPolicies.length > 0,
  );
  TestValidator.predicate(
    "ageRestrictionPolicies array should not be empty",
    overview.ageRestrictionPolicies.length > 0,
  );
}
