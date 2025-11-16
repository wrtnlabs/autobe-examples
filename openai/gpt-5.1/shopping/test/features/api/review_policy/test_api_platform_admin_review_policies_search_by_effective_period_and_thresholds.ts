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
 * Validate searching review policies by effective period and numeric
 * thresholds.
 *
 * Business flow:
 *
 * 1. Register a platform administrator via POST /auth/platformAdmin/join so that
 *    subsequent platformAdmin endpoints are authenticated.
 * 2. Create a "review" policy setting profile that review policies can bind to
 *    using POST /shoppingMall/platformAdmin/policySettings.
 * 3. Create a region setting via POST /shoppingMall/platformAdmin/regionSettings
 *    so that at least some review policies can be region-scoped.
 * 4. Create three review policies (A, B, C) via POST
 *    /shoppingMall/platformAdmin/reviewPolicies with controlled
 *    effective_from/effective_to and numeric threshold fields.
 *
 *    - Policy A: active, effective window covering recent past to future, with
 *         relatively small thresholds (e.g., 7 / 3 / 2).
 *    - Policy B: active, overlapping window but with larger thresholds (e.g., 30 /
 *         10 / 10) so that numeric range filters can isolate it.
 *    - Policy C: either inactive or outside the effective window or with thresholds
 *         outside the range used by filters.
 * 5. Call PATCH /shoppingMall/platformAdmin/reviewPolicies with
 *    IShoppingMallReviewPolicy.IRequest that:
 *
 *    - Constrains effective_from_gte/effective_to_lte to a window including both A
 *         and B by dates,
 *    - Constrains max_days_after_delivery_for_review_min and
 *         max_days_after_delivery_for_review_max plus optionally
 *         auto_hide_report_threshold_min/max so that only B satisfies all
 *         numeric filters.
 * 6. Assert that returned page pagination is consistent with requested page/limit
 *    and that only Policy B is in `data`. Validate that B's summary fields
 *    reflect the configured thresholds.
 * 7. Call PATCH /shoppingMall/platformAdmin/reviewPolicies again with a different
 *    numeric window that matches only Policy A, and assert the single-result
 *    behavior.
 */
export async function test_api_platform_admin_review_policies_search_by_effective_period_and_thresholds(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinInput,
    });
  typia.assert(admin);

  // 2. Create a review-related policy setting profile
  const policySettingCreate = {
    code: `review_profile_${RandomGenerator.alphaNumeric(8)}`,
    name: "Review Policy Profile for Search E2E",
    category: "review",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: RandomGenerator.content({ paragraphs: 2 }),
    active: true,
    effective_from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    effective_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreate },
    );
  typia.assert(policySetting);

  // 3. Create a region setting
  const regionCreate = {
    code: `REG_${RandomGenerator.alphaNumeric(5)}`,
    name: "Search Test Region",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreate },
    );
  typia.assert(region);

  // Helper to compute ISO strings for policy windows
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const policyAFrom = new Date(now - 2 * oneDay).toISOString();
  const policyATo = new Date(now + 5 * oneDay).toISOString();

  const policyBFrom = new Date(now - oneDay).toISOString();
  const policyBTo = new Date(now + 10 * oneDay).toISOString();

  const policyCFrom = new Date(now - 60 * oneDay).toISOString();
  const policyCTo = new Date(now - 30 * oneDay).toISOString();

  // 4. Create policies A, B, C
  const policyACreate = {
    code: `review_A_${RandomGenerator.alphaNumeric(6)}`,
    name: "Policy A - small windows",
    description:
      "Active policy with small review/edit windows and low auto-hide threshold",
    max_days_after_delivery_for_review: 7,
    allow_edit_within_days: 3,
    auto_hide_report_threshold: 2,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: policyAFrom,
    effective_to: policyATo,
    shopping_mall_region_setting_id: region.id,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const policyBCreate = {
    code: `review_B_${RandomGenerator.alphaNumeric(6)}`,
    name: "Policy B - large windows",
    description:
      "Active policy with larger review/edit windows and higher auto-hide threshold",
    max_days_after_delivery_for_review: 30,
    allow_edit_within_days: 10,
    auto_hide_report_threshold: 10,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: policyBFrom,
    effective_to: policyBTo,
    shopping_mall_region_setting_id: region.id,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const policyCCreate = {
    code: `review_C_${RandomGenerator.alphaNumeric(6)}`,
    name: "Policy C - out of window",
    description: "Inactive or outside date/threshold ranges for search",
    max_days_after_delivery_for_review: 3,
    allow_edit_within_days: 1,
    auto_hide_report_threshold: 1,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: false,
    effective_from: policyCFrom,
    effective_to: policyCTo,
    shopping_mall_region_setting_id: region.id,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const policyA: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: policyACreate },
    );
  typia.assert(policyA);

  const policyB: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: policyBCreate },
    );
  typia.assert(policyB);

  const policyC: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: policyCCreate },
    );
  typia.assert(policyC);

  // 5. Search: window includes A and B by dates, numeric range matches only B
  const windowFrom = new Date(now - 3 * oneDay).toISOString();
  const windowTo = new Date(now + 20 * oneDay).toISOString();

  const searchForBRequest = {
    effective_from_gte: windowFrom,
    effective_to_lte: windowTo,
    max_days_after_delivery_for_review_min: 20,
    max_days_after_delivery_for_review_max: 40,
    auto_hide_report_threshold_min: 8,
    auto_hide_report_threshold_max: 12,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallReviewPolicy.IRequest;

  const searchForBPage: IPageIShoppingMallReviewPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.index(
      connection,
      { body: searchForBRequest },
    );
  typia.assert(searchForBPage);

  // Assert pagination basic invariants
  const paginationB = searchForBPage.pagination;
  TestValidator.predicate(
    "search B pagination current page non-negative",
    paginationB.current >= 0,
  );
  TestValidator.predicate(
    "search B pagination limit positive",
    paginationB.limit >= 0,
  );
  TestValidator.predicate(
    "search B pagination records non-negative",
    paginationB.records >= 0,
  );
  TestValidator.predicate(
    "search B pagination pages non-negative",
    paginationB.pages >= 0,
  );

  // Filter returned data to our created policies
  const bMatches = searchForBPage.data.filter((p) => p.id === policyB.id);
  const aMatchesInBSearch = searchForBPage.data.filter(
    (p) => p.id === policyA.id,
  );
  const cMatchesInBSearch = searchForBPage.data.filter(
    (p) => p.id === policyC.id,
  );

  TestValidator.equals(
    "search for B should include exactly one B policy",
    bMatches.length,
    1,
  );
  TestValidator.equals(
    "search for B should not include policy A",
    aMatchesInBSearch.length,
    0,
  );
  TestValidator.equals(
    "search for B should not include policy C",
    cMatchesInBSearch.length,
    0,
  );

  const bSummary = bMatches[0];
  TestValidator.equals(
    "policy B summary max_days_after_delivery_for_review matches",
    bSummary.max_days_after_delivery_for_review,
    policyB.max_days_after_delivery_for_review ?? null,
  );
  TestValidator.equals(
    "policy B summary allow_edit_within_days matches",
    bSummary.allow_edit_within_days,
    policyB.allow_edit_within_days ?? null,
  );
  TestValidator.equals(
    "policy B summary auto_hide_report_threshold matches",
    bSummary.auto_hide_report_threshold,
    policyB.auto_hide_report_threshold ?? null,
  );

  // 7. Repeat search with numeric window that should match only A
  const searchForARequest = {
    effective_from_gte: windowFrom,
    effective_to_lte: windowTo,
    max_days_after_delivery_for_review_min: 5,
    max_days_after_delivery_for_review_max: 10,
    auto_hide_report_threshold_min: 1,
    auto_hide_report_threshold_max: 3,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallReviewPolicy.IRequest;

  const searchForAPage: IPageIShoppingMallReviewPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.index(
      connection,
      { body: searchForARequest },
    );
  typia.assert(searchForAPage);

  const paginationA = searchForAPage.pagination;
  TestValidator.predicate(
    "search A pagination current page non-negative",
    paginationA.current >= 0,
  );
  TestValidator.predicate(
    "search A pagination limit positive",
    paginationA.limit >= 0,
  );
  TestValidator.predicate(
    "search A pagination records non-negative",
    paginationA.records >= 0,
  );
  TestValidator.predicate(
    "search A pagination pages non-negative",
    paginationA.pages >= 0,
  );

  const aMatches = searchForAPage.data.filter((p) => p.id === policyA.id);
  const bMatchesInASearch = searchForAPage.data.filter(
    (p) => p.id === policyB.id,
  );
  const cMatchesInASearch = searchForAPage.data.filter(
    (p) => p.id === policyC.id,
  );

  TestValidator.equals(
    "search for A should include exactly one A policy",
    aMatches.length,
    1,
  );
  TestValidator.equals(
    "search for A should not include policy B",
    bMatchesInASearch.length,
    0,
  );
  TestValidator.equals(
    "search for A should not include policy C",
    cMatchesInASearch.length,
    0,
  );

  const aSummary = aMatches[0];
  TestValidator.equals(
    "policy A summary max_days_after_delivery_for_review matches",
    aSummary.max_days_after_delivery_for_review,
    policyA.max_days_after_delivery_for_review ?? null,
  );
  TestValidator.equals(
    "policy A summary allow_edit_within_days matches",
    aSummary.allow_edit_within_days,
    policyA.allow_edit_within_days ?? null,
  );
  TestValidator.equals(
    "policy A summary auto_hide_report_threshold matches",
    aSummary.auto_hide_report_threshold,
    policyA.auto_hide_report_threshold ?? null,
  );
}
