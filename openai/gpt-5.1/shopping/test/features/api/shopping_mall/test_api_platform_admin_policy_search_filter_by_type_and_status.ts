import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPolicySearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPolicySearchResult";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySearch";
import type { IShoppingMallPolicySearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySearchResult";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallReviewPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewPolicy";

export async function test_api_platform_admin_policy_search_filter_by_type_and_status(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (auth + token setup)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "platform admin should be active",
    admin.isActive === true,
  );

  // 2. Create a shared policy setting profile
  const policySettingCode = `ps-${RandomGenerator.alphaNumeric(8)}`;
  const policySettingBody = {
    code: policySettingCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      {
        body: policySettingBody,
      },
    );
  typia.assert(policySetting);
  TestValidator.equals(
    "created policy setting code matches",
    policySetting.code,
    policySettingCode,
  );

  // 3. Create cancellation policies (one active, one inactive)
  const cancellationPolicyTypeKey = "cancellation";

  const activeCancellationCode = `can-active-${RandomGenerator.alphaNumeric(6)}`;
  const activeCancellationBody = {
    code: activeCancellationCode,
    name: "Active Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const activeCancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: activeCancellationBody,
      },
    );
  typia.assert(activeCancellationPolicy);

  const inactiveCancellationCode = `can-inactive-${RandomGenerator.alphaNumeric(6)}`;
  const inactiveCancellationBody = {
    code: inactiveCancellationCode,
    name: "Inactive Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: false,
    max_hours_after_payment: 48,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: false,
    region_code: null,
    policy_setting_code: policySettingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const inactiveCancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      {
        body: inactiveCancellationBody,
      },
    );
  typia.assert(inactiveCancellationPolicy);

  // 4. Create an active refund policy
  const refundPolicyCode = `refund-${RandomGenerator.alphaNumeric(6)}`;
  const refundPolicyBody = {
    code: refundPolicyCode,
    name: "Active Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    maxRefundRate: 1,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: policySettingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      {
        body: refundPolicyBody,
      },
    );
  typia.assert(refundPolicy);
  TestValidator.predicate(
    "refund policy is active",
    refundPolicy.isActive === true,
  );

  // 5. Create review policies (one inactive, one active)
  const reviewPolicyTypeKey = "review";

  const inactiveReviewCode = `review-inactive-${RandomGenerator.alphaNumeric(6)}`;
  const inactiveReviewBody = {
    code: inactiveReviewCode,
    name: "Inactive Review Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    max_days_after_delivery_for_review: 30,
    allow_edit_within_days: 7,
    auto_hide_report_threshold: 5,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: false,
    effective_from: new Date().toISOString(),
    effective_to: null,
    shopping_mall_region_setting_id: null,
    shopping_mall_policy_setting_id: null,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const inactiveReviewPolicy: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      {
        body: inactiveReviewBody,
      },
    );
  typia.assert(inactiveReviewPolicy);

  const activeReviewCode = `review-active-${RandomGenerator.alphaNumeric(6)}`;
  const activeReviewBody = {
    code: activeReviewCode,
    name: "Active Review Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    max_days_after_delivery_for_review: 30,
    allow_edit_within_days: 7,
    auto_hide_report_threshold: 10,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
    shopping_mall_region_setting_id: null,
    shopping_mall_policy_setting_id: null,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const activeReviewPolicy: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      {
        body: activeReviewBody,
      },
    );
  typia.assert(activeReviewPolicy);

  // 6. Create one age restriction policy just to populate index
  const agePolicyCode = `age-${RandomGenerator.alphaNumeric(6)}`;
  const agePolicyBody = {
    code: agePolicyCode,
    name: "Age Restriction Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    minimum_age_years: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    require_verified_age: true,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
    region_setting_id: null,
    policy_setting_id: null,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const ageRestrictionPolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      {
        body: agePolicyBody,
      },
    );
  typia.assert(ageRestrictionPolicy);

  // Helper to assert that a result entry matches type/status filters
  const assertPolicyResultMatches = (
    entry: IShoppingMallPolicySearchResult,
    expectedType: string,
    expectedIsActive: boolean,
  ): void => {
    TestValidator.equals(
      "policyType must match filter",
      entry.policyType,
      expectedType,
    );
    TestValidator.equals(
      "isActive must match filter",
      entry.isActive,
      expectedIsActive,
    );
  };

  // 7. First search: filter by cancellation + active
  const searchCancellationRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    policy_types: [cancellationPolicyTypeKey],
    statuses: ["active"],
    effective_from: undefined,
    effective_to: undefined,
    region_codes: undefined,
    search: undefined,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallPolicySearch.IRequest;

  const cancellationPage: IPageIShoppingMallPolicySearchResult =
    await api.functional.shoppingMall.platformAdmin.search.policies.index(
      connection,
      {
        body: searchCancellationRequest,
      },
    );
  typia.assert(cancellationPage);

  const cancellationPagination: IPage.IPagination = cancellationPage.pagination;
  typia.assert(cancellationPagination);

  const cancellationResults: IShoppingMallPolicySearchResult[] =
    cancellationPage.data;

  // Pagination metadata should be consistent with data length
  TestValidator.predicate(
    "pagination.records must be >= number of returned cancellation results",
    cancellationPagination.records >= cancellationResults.length,
  );
  TestValidator.predicate(
    "pagination.records must be at least 1 when active cancellation policy exists",
    cancellationPagination.records >= 1,
  );

  // Ensure every result matches policyType and isActive filters
  for (const entry of cancellationResults) {
    assertPolicyResultMatches(entry, cancellationPolicyTypeKey, true);
  }

  // Ensure our active cancellation policy appears in results
  const foundActiveCancellation = cancellationResults.find(
    (e) =>
      e.policyCode === activeCancellationCode ||
      e.name === activeCancellationPolicy.name,
  );
  TestValidator.predicate(
    "active cancellation policy must be included in search results",
    foundActiveCancellation !== undefined,
  );

  // Ensure inactive cancellation policy is not returned
  const foundInactiveCancellation = cancellationResults.find(
    (e) =>
      e.policyCode === inactiveCancellationCode ||
      e.name === inactiveCancellationPolicy.name,
  );
  TestValidator.predicate(
    "inactive cancellation policy must not be included in active-only search",
    foundInactiveCancellation === undefined,
  );

  // Ensure refund and review policies are not returned when filtering only cancellation
  const nonCancellationEntries = cancellationResults.filter(
    (e) =>
      e.policyCode === refundPolicyCode ||
      e.policyCode === inactiveReviewCode ||
      e.policyCode === activeReviewCode,
  );
  TestValidator.equals(
    "non-cancellation policies must be excluded when filtering by cancellation type",
    nonCancellationEntries.length,
    0,
  );

  // 8. Second search: filter by review + inactive
  const searchReviewInactiveRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    policy_types: [reviewPolicyTypeKey],
    statuses: ["inactive"],
    effective_from: undefined,
    effective_to: undefined,
    region_codes: undefined,
    search: undefined,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallPolicySearch.IRequest;

  const reviewPage: IPageIShoppingMallPolicySearchResult =
    await api.functional.shoppingMall.platformAdmin.search.policies.index(
      connection,
      {
        body: searchReviewInactiveRequest,
      },
    );
  typia.assert(reviewPage);

  const reviewPagination: IPage.IPagination = reviewPage.pagination;
  typia.assert(reviewPagination);

  const reviewResults: IShoppingMallPolicySearchResult[] = reviewPage.data;

  // Pagination metadata should be consistent with data length
  TestValidator.predicate(
    "review pagination.records must be >= number of returned review results",
    reviewPagination.records >= reviewResults.length,
  );

  for (const entry of reviewResults) {
    assertPolicyResultMatches(entry, reviewPolicyTypeKey, false);
  }

  // Ensure inactive review policy appears
  const foundInactiveReview = reviewResults.find(
    (e) =>
      e.policyCode === inactiveReviewCode ||
      e.name === inactiveReviewPolicy.name,
  );
  TestValidator.predicate(
    "inactive review policy must be included in inactive-only review search",
    foundInactiveReview !== undefined,
  );

  // Ensure active review policy is not returned when filtering by inactive status
  const foundActiveReview = reviewResults.find(
    (e) =>
      e.policyCode === activeReviewCode || e.name === activeReviewPolicy.name,
  );
  TestValidator.predicate(
    "active review policy must not be returned in inactive-only review search",
    foundActiveReview === undefined,
  );
}
