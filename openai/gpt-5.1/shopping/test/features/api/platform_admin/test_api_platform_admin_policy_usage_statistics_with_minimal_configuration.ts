import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallAgeRestrictionPolicyUsageStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicyUsageStatistics";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallCancellationPolicyUsageStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicyUsageStatistics";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallPolicyUsageOverallStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyUsageOverallStatistics";
import type { IShoppingMallPolicyUsageStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyUsageStatistics";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRefundPolicyUsageStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicyUsageStatistics";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallReviewPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewPolicy";
import type { IShoppingMallReviewPolicyUsageStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewPolicyUsageStatistics";

export async function test_api_platform_admin_policy_usage_statistics_with_minimal_configuration(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) so that subsequent platformAdmin APIs are authorized.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a cancellation policy with minimal but valid configuration.
  const cancellationCode = `cancel_${RandomGenerator.alphaNumeric(8)}`;
  const cancellationBody = {
    code: cancellationCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: typia.random<number & tags.Type<"int32">>(),
    config_payload: null,
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: null,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationBody },
    );
  typia.assert<IShoppingMallCancellationPolicy>(cancellationPolicy);
  TestValidator.equals(
    "created cancellation policy code should match request",
    cancellationPolicy.code,
    cancellationCode,
  );

  // 3. Create a refund policy.
  const refundCode = `refund_${RandomGenerator.alphaNumeric(8)}`;
  const refundBody = {
    code: refundCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    maxRefundRate: 1,
    requireManualApprovalOverAmount: undefined,
    configurationPayload: undefined,
    isActive: true,
    effectiveFrom: null,
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: null,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundBody },
    );
  typia.assert<IShoppingMallRefundPolicy>(refundPolicy);
  TestValidator.equals(
    "created refund policy code should match request",
    refundPolicy.code,
    refundCode,
  );

  // 4. Create a review policy.
  const reviewCode = `review_${RandomGenerator.alphaNumeric(8)}`;
  const reviewBody = {
    code: reviewCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    max_days_after_delivery_for_review: null,
    allow_edit_within_days: null,
    auto_hide_report_threshold: null,
    config_payload: null,
    active: true,
    effective_from: null,
    effective_to: null,
    shopping_mall_region_setting_id: null,
    shopping_mall_policy_setting_id: null,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const reviewPolicy: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: reviewBody },
    );
  typia.assert<IShoppingMallReviewPolicy>(reviewPolicy);
  TestValidator.equals(
    "created review policy code should match request",
    reviewPolicy.code,
    reviewCode,
  );

  // 5. Create an age restriction policy.
  const ageRestrictionCode = `age_${RandomGenerator.alphaNumeric(8)}`;
  const ageRestrictionBody = {
    code: ageRestrictionCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    minimum_age_years: typia.random<number & tags.Type<"int32">>(),
    require_verified_age: true,
    config_payload: undefined,
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: null,
    policy_setting_id: null,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const ageRestrictionPolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: ageRestrictionBody },
    );
  typia.assert<IShoppingMallAgeRestrictionPolicy>(ageRestrictionPolicy);
  TestValidator.equals(
    "created age restriction policy code should match request",
    ageRestrictionPolicy.code,
    ageRestrictionCode,
  );

  // 6. Immediately call the policy usage statistics endpoint.
  const statistics: IShoppingMallPolicyUsageStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.policy_usage.index(
      connection,
    );
  typia.assert<IShoppingMallPolicyUsageStatistics>(statistics);

  // 7. Validate that statistics arrays exist and are non-null.
  TestValidator.predicate(
    "cancellationPolicyStatistics should be an array",
    Array.isArray(statistics.cancellationPolicyStatistics),
  );
  TestValidator.predicate(
    "refundPolicyStatistics should be an array",
    Array.isArray(statistics.refundPolicyStatistics),
  );
  TestValidator.predicate(
    "reviewPolicyStatistics should be an array",
    Array.isArray(statistics.reviewPolicyStatistics),
  );
  TestValidator.predicate(
    "ageRestrictionPolicyStatistics should be an array",
    Array.isArray(statistics.ageRestrictionPolicyStatistics),
  );

  // 8. For each policy type, locate the entry for the newly created policy code if present
  //    and verify that its counts are zero or at least non-negative.

  const cancellationUsageForCreated:
    | IShoppingMallCancellationPolicyUsageStatistics
    | undefined = statistics.cancellationPolicyStatistics.find(
    (row) => row.policyCode === cancellationCode,
  );
  if (cancellationUsageForCreated !== undefined) {
    TestValidator.predicate(
      "cancellationRequestCount should be non-negative",
      cancellationUsageForCreated.cancellationRequestCount >= 0,
    );
    TestValidator.predicate(
      "cancelledOrderCount should be non-negative",
      cancellationUsageForCreated.cancelledOrderCount >= 0,
    );
  }

  const refundUsageForCreated:
    | IShoppingMallRefundPolicyUsageStatistics
    | undefined = statistics.refundPolicyStatistics.find(
    (row) => row.policyCode === refundCode,
  );
  if (refundUsageForCreated !== undefined) {
    TestValidator.predicate(
      "refundTransactionCount should be non-negative",
      refundUsageForCreated.refundTransactionCount >= 0,
    );
    TestValidator.predicate(
      "refundedAmountTotal should be non-negative",
      refundUsageForCreated.refundedAmountTotal >= 0,
    );
  }

  const reviewUsageForCreated:
    | IShoppingMallReviewPolicyUsageStatistics
    | undefined = statistics.reviewPolicyStatistics.find(
    (row) => row.policyCode === reviewCode,
  );
  if (reviewUsageForCreated !== undefined) {
    TestValidator.predicate(
      "reviewCreationCount should be non-negative",
      reviewUsageForCreated.reviewCreationCount >= 0,
    );
    TestValidator.predicate(
      "reviewModerationActionCount should be non-negative",
      reviewUsageForCreated.reviewModerationActionCount >= 0,
    );
    TestValidator.predicate(
      "reviewReportCount should be non-negative",
      reviewUsageForCreated.reviewReportCount >= 0,
    );
  }

  const ageRestrictionUsageForCreated:
    | IShoppingMallAgeRestrictionPolicyUsageStatistics
    | undefined = statistics.ageRestrictionPolicyStatistics.find(
    (row) => row.policyCode === ageRestrictionCode,
  );
  if (ageRestrictionUsageForCreated !== undefined) {
    TestValidator.predicate(
      "blockedAttemptCount should be non-negative",
      ageRestrictionUsageForCreated.blockedAttemptCount >= 0,
    );
    TestValidator.predicate(
      "warningShownCount should be non-negative",
      ageRestrictionUsageForCreated.warningShownCount >= 0,
    );
  }

  // 9. Validate overall aggregate section exists and has consistent, non-negative metrics.
  const overall: IShoppingMallPolicyUsageOverallStatistics = statistics.overall;
  typia.assert<IShoppingMallPolicyUsageOverallStatistics>(overall);

  TestValidator.predicate(
    "totalCancellationRequestCount should be non-negative",
    overall.totalCancellationRequestCount >= 0,
  );
  TestValidator.predicate(
    "totalCancelledOrderCount should be non-negative",
    overall.totalCancelledOrderCount >= 0,
  );
  TestValidator.predicate(
    "totalRefundTransactionCount should be non-negative",
    overall.totalRefundTransactionCount >= 0,
  );
  TestValidator.predicate(
    "totalRefundedAmount should be non-negative",
    overall.totalRefundedAmount >= 0,
  );
  TestValidator.predicate(
    "totalReviewCreationCount should be non-negative",
    overall.totalReviewCreationCount >= 0,
  );
  TestValidator.predicate(
    "totalReviewModerationActionCount should be non-negative",
    overall.totalReviewModerationActionCount >= 0,
  );
  TestValidator.predicate(
    "totalAgeRestrictionBlockedAttemptCount should be non-negative",
    overall.totalAgeRestrictionBlockedAttemptCount >= 0,
  );
}
