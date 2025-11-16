import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IShoppingMallReviewPolicyUsageStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewPolicyUsageStatistics";

/**
 * Verify platform admin access to policy usage statistics after creating
 * cancellation and refund policies.
 *
 * Business intent:
 *
 * - A platform administrator, once registered via the join endpoint, should be
 *   able to create cancellation and refund policies.
 * - After such configuration changes, the analytics endpoint GET
 *   /shoppingMall/platformAdmin/statistics/policy-usage must be accessible to
 *   that admin and return a well-typed IShoppingMallPolicyUsageStatistics
 *   object.
 * - We do not attempt to simulate unauthenticated or invalid-token requests in
 *   this test, because the SDK manages headers internally and the test layer
 *   must not touch connection.headers.
 *
 * Scenario steps:
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join.
 *
 *    - Use IShoppingMallPlatformAdminJoin.IRequest for the join payload.
 *    - Rely on the SDK to wire the returned JWT access token into
 *         connection.headers.Authorization.
 * 2. As the authenticated platform admin, create one cancellation policy via POST
 *    /shoppingMall/platformAdmin/cancellationPolicies.
 *
 *    - Use IShoppingMallCancellationPolicy.ICreate for the request body.
 *    - Provide a unique code, name, flags, and reasonable optional values.
 * 3. Create one refund policy via POST /shoppingMall/platformAdmin/refundPolicies.
 *
 *    - Use IShoppingMallRefundPolicy.ICreate for the request body.
 * 4. Call GET /shoppingMall/platformAdmin/statistics/policy-usage.
 *
 *    - Assert the response type with
 *         typia.assert<IShoppingMallPolicyUsageStatistics>().
 *    - Use TestValidator to perform basic logical checks such as ensuring arrays
 *         exist and overall counters are non-negative.
 */
export async function test_api_platform_admin_policy_usage_statistics_access_control(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a cancellation policy
  const cancellationPolicyBody = {
    code: `CANCEL_${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 48,
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
      {
        body: cancellationPolicyBody,
      },
    );
  typia.assert<IShoppingMallCancellationPolicy>(cancellationPolicy);

  // 3. Create a refund policy
  const nowIso = new Date().toISOString();
  const refundPolicyBody = {
    code: `REFUND_${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30,
    maxRefundRate: 1,
    requireManualApprovalOverAmount: undefined,
    configurationPayload: undefined,
    isActive: true,
    effectiveFrom: nowIso,
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: null,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      {
        body: refundPolicyBody,
      },
    );
  typia.assert<IShoppingMallRefundPolicy>(refundPolicy);

  // 4. Fetch policy usage statistics as the authorized platform admin
  const stats: IShoppingMallPolicyUsageStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.policy_usage.index(
      connection,
    );
  typia.assert<IShoppingMallPolicyUsageStatistics>(stats);

  // Basic logical validations beyond type checks
  TestValidator.predicate(
    "cancellationPolicyStatistics array should be present (non-null)",
    Array.isArray(stats.cancellationPolicyStatistics),
  );
  TestValidator.predicate(
    "refundPolicyStatistics array should be present (non-null)",
    Array.isArray(stats.refundPolicyStatistics),
  );
  TestValidator.predicate(
    "reviewPolicyStatistics array should be present (non-null)",
    Array.isArray(stats.reviewPolicyStatistics),
  );
  TestValidator.predicate(
    "ageRestrictionPolicyStatistics array should be present (non-null)",
    Array.isArray(stats.ageRestrictionPolicyStatistics),
  );

  // Validate that overall totals are non-negative numbers
  const overall = stats.overall;
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
