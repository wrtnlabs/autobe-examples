import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewPolicy";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallReviewPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewPolicy";

/**
 * Validate basic filter and pagination behavior for platform admin review
 * policy search.
 *
 * Business goal: Ensure that a platform administrator can search review
 * policies using the PATCH /shoppingMall/platformAdmin/reviewPolicies endpoint
 * with simple filters on `code` and `active`, and receive a correctly paginated
 * summary list that only includes matching policies and excludes non-matching
 * ones.
 *
 * High level steps:
 *
 * 1. Bootstrap a platform admin session using POST /auth/platformAdmin/join.
 * 2. Create a reusable policy setting profile via POST
 *    /shoppingMall/platformAdmin/policySettings.
 * 3. Create a region setting via POST /shoppingMall/platformAdmin/regionSettings.
 * 4. Create two review policies with different codes/active flags via POST
 *    /shoppingMall/platformAdmin/reviewPolicies.
 * 5. Call PATCH /shoppingMall/platformAdmin/reviewPolicies with filters that
 *    should match only one of the policies and validate the result page.
 * 6. Call PATCH again with filters that match the other policy (different active
 *    flag) and validate exclusion of the first policy.
 */
export async function test_api_platform_admin_review_policies_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin to obtain an authorized session.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a reusable policy setting profile.
  const policySettingBody = {
    code: `policy-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Review Policy Setting",
    category: "review",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: new Date().toISOString(),
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingBody },
    );
  typia.assert(policySetting);

  // 3. Create a region setting to associate with review policies.
  const regionCode = `REG-${RandomGenerator.alphabets(4).toUpperCase()}`;
  const regionBody = {
    code: regionCode,
    name: "Test Region for Review Policies",
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert(region);

  // 4. Create two review policies with different codes and active flags.
  const now = new Date();
  const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const targetCodePrefix = "target-review-policy";
  const targetPolicyCode = `${targetCodePrefix}-${RandomGenerator.alphaNumeric(6)}`;
  const otherPolicyCode = `other-review-policy-${RandomGenerator.alphaNumeric(6)}`;

  // 4-1. Policy A: active, matches code filter, linked to region & policy setting.
  const reviewPolicyABody = {
    code: targetPolicyCode,
    name: "Target Review Policy A",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    max_days_after_delivery_for_review: 30,
    allow_edit_within_days: 7,
    auto_hide_report_threshold: 5,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: now.toISOString(),
    effective_to: later.toISOString(),
    shopping_mall_region_setting_id: region.id,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const reviewPolicyA: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: reviewPolicyABody },
    );
  typia.assert(reviewPolicyA);

  // 4-2. Policy B: different code and inactive to be filtered out by active=true.
  const reviewPolicyBBody = {
    code: otherPolicyCode,
    name: "Other Review Policy B",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    max_days_after_delivery_for_review: 15,
    allow_edit_within_days: 3,
    auto_hide_report_threshold: 10,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: false,
    effective_from: now.toISOString(),
    effective_to: later.toISOString(),
    shopping_mall_region_setting_id: region.id,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const reviewPolicyB: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: reviewPolicyBBody },
    );
  typia.assert(reviewPolicyB);

  // 5. Search with filters matching only policy A (code + active=true).
  const page: number & tags.Type<"int32"> & tags.Minimum<1> = 1;
  const limit: number & tags.Type<"int32"> & tags.Minimum<1> = 10;

  const requestA = {
    code: targetPolicyCode,
    active: true,
    page,
    limit,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallReviewPolicy.IRequest;

  const pageA: IPageIShoppingMallReviewPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.index(
      connection,
      { body: requestA },
    );
  typia.assert(pageA);

  // 6. Validate pagination metadata reflects the request semantics.
  TestValidator.equals(
    "pagination.current should be zero-based page index (page-1)",
    pageA.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination.limit should equal requested limit",
    pageA.pagination.limit,
    limit,
  );

  // Validate that all returned policies match the filter and include policy A.
  TestValidator.predicate(
    "search result must contain at least one review policy",
    () => pageA.data.length > 0,
  );

  const allMatchFilterA = pageA.data.every((summary) => {
    return summary.code === targetPolicyCode && summary.active === true;
  });
  TestValidator.predicate(
    "all returned policies must match code and active=true filter",
    allMatchFilterA,
  );

  const containsPolicyA = pageA.data.some(
    (summary) => summary.id === reviewPolicyA.id,
  );
  TestValidator.predicate(
    "result set should contain the specifically created policy A",
    containsPolicyA,
  );

  const containsPolicyBInA = pageA.data.some(
    (summary) => summary.id === reviewPolicyB.id,
  );
  TestValidator.predicate(
    "policy B should not appear in results for active=true & target code",
    () => containsPolicyBInA === false,
  );

  // 7. Negative filter: search for inactive policies with policy B's code.
  const requestB = {
    code: otherPolicyCode,
    active: false,
    page,
    limit,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallReviewPolicy.IRequest;

  const pageB: IPageIShoppingMallReviewPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.index(
      connection,
      { body: requestB },
    );
  typia.assert(pageB);

  TestValidator.equals(
    "pagination.current for B search should be zero-based page index",
    pageB.pagination.current,
    0,
  );

  const allMatchFilterB = pageB.data.every((summary) => {
    return summary.code === otherPolicyCode && summary.active === false;
  });
  TestValidator.predicate(
    "all returned policies for B search must match inactive & code filter",
    allMatchFilterB,
  );

  const containsPolicyB = pageB.data.some(
    (summary) => summary.id === reviewPolicyB.id,
  );
  TestValidator.predicate(
    "result set for B search should contain policy B",
    containsPolicyB,
  );

  const containsPolicyAInB = pageB.data.some(
    (summary) => summary.id === reviewPolicyA.id,
  );
  TestValidator.predicate(
    "policy A should not appear in results for inactive & other code",
    () => containsPolicyAInB === false,
  );
}
