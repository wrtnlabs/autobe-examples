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

/**
 * Validate basic unified policy search listing for platform admin.
 *
 * Business goal: Ensure that when a platform admin has configured at least one
 * policy setting profile and one instance of each policy type (cancellation,
 * refund, review, age restriction), the unified search endpoint
 * `/shoppingMall/platformAdmin/search/policies` can list them with correct
 * pagination metadata and classification.
 *
 * Steps:
 *
 * 1. Join as a platform administrator (POST /auth/platformAdmin/join) to obtain an
 *    authenticated admin session (SDK wires token).
 * 2. Create a base policy setting profile (POST
 *    /shoppingMall/platformAdmin/policySettings) that downstream policies can
 *    reference via its `code`.
 * 3. Create one cancellation policy, binding it to the policy setting profile
 *    using `policy_setting_code`.
 * 4. Create one refund policy, binding it to the same policy setting via
 *    `policySettingCode`.
 * 5. Create one review policy, binding it to the same policy setting via
 *    `shopping_mall_policy_setting_id` using the setting's id.
 * 6. Create one age restriction policy, binding it to the same policy setting via
 *    `policy_setting_id` using the setting's id.
 * 7. Call PATCH /shoppingMall/platformAdmin/search/policies with page=1, small
 *    limit (e.g., 10), and no `policy_types` filter so that all policies are
 *    eligible to appear.
 * 8. Validate that the response type is IPageIShoppingMallPolicySearchResult and
 *    that pagination metadata reflects at least the number of created policies,
 *    with `pagination.current` referencing the first page and
 *    `pagination.limit` equal to the requested limit.
 * 9. Verify that `data` contains entries corresponding to each created policy (at
 *    minimum one for each policy type) and that `policyType`, `name`,
 *    `policyCode`, and `isActive` values are consistent with the created
 *    entities.
 */
export async function test_api_platform_admin_policy_search_basic_listing(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to authenticate SDK connection
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.local/join", // any valid URI
    referrer: "https://shoppingmall.local/landing", // any valid URI
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a base policy setting profile
  const settingCode = `policy-setting-${RandomGenerator.alphaNumeric(8)}`;
  const policySettingCreate = {
    code: settingCode,
    name: "Unified Test Policy Setting",
    category: "unified_policy",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreate },
    );
  typia.assert<IShoppingMallPolicySetting>(policySetting);

  // 3. Create a cancellation policy linked via policy_setting_code
  const cancellationCode = `cancel-${RandomGenerator.alphaNumeric(6)}`;
  const cancellationCreate = {
    code: cancellationCode,
    name: "Test Cancellation Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: typia.random<number & tags.Type<"int32">>(),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
    active: true,
    region_code: null,
    policy_setting_code: settingCode,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationCreate },
    );
  typia.assert<IShoppingMallCancellationPolicy>(cancellationPolicy);

  // 4. Create a refund policy linked via policySettingCode
  const refundCode = `refund-${RandomGenerator.alphaNumeric(6)}`;
  const refundCreate = {
    code: refundCode,
    name: "Test Refund Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    regionCode: null,
    policySettingCode: settingCode,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundCreate },
    );
  typia.assert<IShoppingMallRefundPolicy>(refundPolicy);

  // 5. Create a review policy linked via shopping_mall_policy_setting_id
  const reviewCode = `review-${RandomGenerator.alphaNumeric(6)}`;
  const reviewCreate = {
    code: reviewCode,
    name: "Test Review Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    max_days_after_delivery_for_review: typia.random<
      number & tags.Type<"int32">
    >(),
    allow_edit_within_days: typia.random<number & tags.Type<"int32">>(),
    auto_hide_report_threshold: typia.random<number & tags.Type<"int32">>(),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
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
  typia.assert<IShoppingMallReviewPolicy>(reviewPolicy);

  // 6. Create an age restriction policy linked via policy_setting_id
  const ageCode = `age-${RandomGenerator.alphaNumeric(6)}`;
  const ageCreate = {
    code: ageCode,
    name: "Test Age Restriction Policy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    minimum_age_years: typia.random<number & tags.Type<"int32">>(),
    require_verified_age: true,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
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
  typia.assert<IShoppingMallAgeRestrictionPolicy>(agePolicy);

  // 7. Call unified policy search with minimal filters and pagination
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const searchRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    // No policy_types filter -> allow all types to be returned
    policy_types: undefined,
    statuses: undefined,
    effective_from: undefined,
    effective_to: undefined,
    region_codes: undefined,
    search: undefined,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallPolicySearch.IRequest;

  const pageResult: IPageIShoppingMallPolicySearchResult =
    await api.functional.shoppingMall.platformAdmin.search.policies.index(
      connection,
      { body: searchRequest },
    );
  typia.assert<IPageIShoppingMallPolicySearchResult>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 8. Basic pagination validations
  TestValidator.equals(
    "pagination.limit matches request limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "records count is at least number of created policies",
    pagination.records >= 4,
  );

  // 9. Verify data contains entries for each created policy code
  const results: IShoppingMallPolicySearchResult[] = pageResult.data;
  typia.assert(results);

  const codesToFind = [cancellationCode, refundCode, reviewCode, ageCode];

  for (const code of codesToFind) {
    const found = results.find((row) => row.policyCode === code);
    TestValidator.predicate(
      `search results contain entry for policy code ${code}`,
      found !== undefined,
    );
    if (found) {
      typia.assert<IShoppingMallPolicySearchResult>(found);
      TestValidator.predicate(
        `policy ${code} is active in search result`,
        found.isActive === true,
      );
    }
  }
}
