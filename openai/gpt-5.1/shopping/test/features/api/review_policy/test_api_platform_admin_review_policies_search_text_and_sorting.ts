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
 * Validate platform admin review policy search and sorting behavior.
 *
 * Business objectives:
 *
 * - Ensure that platform administrators can locate specific review policies using
 *   full-text search over name/description.
 * - Ensure that the review policy listing endpoint respects requested sorting
 *   options (by name and by code, both directions).
 * - Validate that pagination metadata is structurally correct when filters and
 *   sorting are applied.
 *
 * Scenario steps:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join, establishing an
 *    authenticated context (SDK handles tokens).
 * 2. Create a policy setting profile (category "review") via POST
 *    /shoppingMall/platformAdmin/policySettings to link from review policies.
 * 3. Create a region setting via POST /shoppingMall/platformAdmin/regionSettings
 *    to scope the review policies.
 * 4. Seed three review policies via POST
 *    /shoppingMall/platformAdmin/reviewPolicies with distinct
 *    codes/names/descriptions:
 *
 *    - Default_review / "Default Review" / description contains "standard review
 *         rules".
 *    - Strict_moderation / "Strict Moderation" / description mentions "aggressive
 *         auto-hide" and "strict".
 *    - Lenient_review / "Lenient Review" / description mentions "extended review
 *         window".
 * 5. Call PATCH /shoppingMall/platformAdmin/reviewPolicies with
 *    IShoppingMallReviewPolicy.IRequest, setting:
 *
 *    - Search = "strict"
 *    - Order_by = "name"
 *    - Order_direction = "asc"
 *    - Page = 1, limit = 10 Expectation: Strict Moderation appears; Default/Lenient
 *         do not.
 * 6. Call PATCH again without search but with order_by = "name" and
 *    order_direction = "asc" to validate alphabetical ordering by name.
 * 7. Call PATCH a third time with order_by = "code" and order_direction = "desc"
 *    to validate descending ordering by code.
 */
export async function test_api_platform_admin_review_policies_search_text_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create policy setting profile (category "review")
  const policySettingBody = {
    code: `review_profile_${RandomGenerator.alphaNumeric(8)}`,
    name: "Review Policy Profile",
    category: "review",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
  typia.assert<IShoppingMallPolicySetting>(policySetting);

  // 3. Create region setting
  const regionSettingBody = {
    code: `REG_${RandomGenerator.alphaNumeric(6)}`,
    name: "Test Region",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const regionSetting: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionSettingBody },
    );
  typia.assert<IShoppingMallRegionSetting>(regionSetting);

  // Helper to build timestamps
  const nowIso = new Date().toISOString();

  // 4. Seed three review policies
  const defaultReviewBody = {
    code: `default_review_${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Review",
    description: "Standard review rules for all products",
    max_days_after_delivery_for_review: 30,
    allow_edit_within_days: 7,
    auto_hide_report_threshold: 10,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: nowIso,
    effective_to: null,
    shopping_mall_region_setting_id: regionSetting.id,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const strictModerationBody = {
    code: `strict_moderation_${RandomGenerator.alphaNumeric(6)}`,
    name: "Strict Moderation",
    description:
      "Strict review policy with aggressive auto-hide and strict thresholds",
    max_days_after_delivery_for_review: 14,
    allow_edit_within_days: 3,
    auto_hide_report_threshold: 3,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: nowIso,
    effective_to: null,
    shopping_mall_region_setting_id: regionSetting.id,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const lenientReviewBody = {
    code: `lenient_review_${RandomGenerator.alphaNumeric(6)}`,
    name: "Lenient Review",
    description: "Lenient review policy allowing extended review window",
    max_days_after_delivery_for_review: 60,
    allow_edit_within_days: 30,
    auto_hide_report_threshold: 20,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: nowIso,
    effective_to: null,
    shopping_mall_region_setting_id: regionSetting.id,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const defaultReview: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: defaultReviewBody },
    );
  typia.assert<IShoppingMallReviewPolicy>(defaultReview);

  const strictModeration: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: strictModerationBody },
    );
  typia.assert<IShoppingMallReviewPolicy>(strictModeration);

  const lenientReview: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: lenientReviewBody },
    );
  typia.assert<IShoppingMallReviewPolicy>(lenientReview);

  // 5. Search with keyword "strict" and sort by name asc
  const searchRequestBody = {
    search: "strict",
    page: 1,
    limit: 10,
    order_by: "name",
    order_direction: "asc",
  } satisfies IShoppingMallReviewPolicy.IRequest;

  const searchResult: IPageIShoppingMallReviewPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.index(
      connection,
      { body: searchRequestBody },
    );
  typia.assert<IPageIShoppingMallReviewPolicy.ISummary>(searchResult);

  // Validate pagination structure
  typia.assert<IPage.IPagination>(searchResult.pagination);
  TestValidator.predicate(
    "search pagination.limit should be >= 1",
    searchResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "search pagination.records should be >= 1 when strict policy exists",
    searchResult.pagination.records >= 1,
  );

  // Validate that our strict policy is present and others are absent
  const searchData = searchResult.data;

  const strictSummary = searchData.find(
    (p) => p.code === strictModeration.code,
  );
  TestValidator.predicate(
    "search result should include strict moderation policy",
    strictSummary !== undefined,
  );

  TestValidator.predicate(
    "search result should not include default review policy",
    searchData.every((p) => p.code !== defaultReview.code),
  );
  TestValidator.predicate(
    "search result should not include lenient review policy",
    searchData.every((p) => p.code !== lenientReview.code),
  );

  // 6. Sort by name asc without search
  const sortByNameRequestBody = {
    page: 1,
    limit: 10,
    order_by: "name",
    order_direction: "asc",
  } satisfies IShoppingMallReviewPolicy.IRequest;

  const sortByNameResult: IPageIShoppingMallReviewPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.index(
      connection,
      { body: sortByNameRequestBody },
    );
  typia.assert<IPageIShoppingMallReviewPolicy.ISummary>(sortByNameResult);

  const sortByNameData = sortByNameResult.data;

  const summaryDefault = sortByNameData.find(
    (p) => p.code === defaultReview.code,
  );
  const summaryStrict = sortByNameData.find(
    (p) => p.code === strictModeration.code,
  );
  const summaryLenient = sortByNameData.find(
    (p) => p.code === lenientReview.code,
  );

  TestValidator.predicate(
    "name-sorted list should contain default review",
    summaryDefault !== undefined,
  );
  TestValidator.predicate(
    "name-sorted list should contain strict moderation",
    summaryStrict !== undefined,
  );
  TestValidator.predicate(
    "name-sorted list should contain lenient review",
    summaryLenient !== undefined,
  );

  if (summaryDefault && summaryLenient && summaryStrict) {
    const indexDefault = sortByNameData.findIndex(
      (p) => p.id === summaryDefault.id,
    );
    const indexLenient = sortByNameData.findIndex(
      (p) => p.id === summaryLenient.id,
    );
    const indexStrict = sortByNameData.findIndex(
      (p) => p.id === summaryStrict.id,
    );

    TestValidator.predicate(
      "name asc: Default Review should come before Lenient Review",
      indexDefault >= 0 && indexLenient >= 0 && indexDefault < indexLenient,
    );
    TestValidator.predicate(
      "name asc: Lenient Review should come before Strict Moderation",
      indexLenient >= 0 && indexStrict >= 0 && indexLenient < indexStrict,
    );
  }

  // 7. Sort by code desc without search
  const sortByCodeDescRequestBody = {
    page: 1,
    limit: 10,
    order_by: "code",
    order_direction: "desc",
  } satisfies IShoppingMallReviewPolicy.IRequest;

  const sortByCodeDescResult: IPageIShoppingMallReviewPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.index(
      connection,
      { body: sortByCodeDescRequestBody },
    );
  typia.assert<IPageIShoppingMallReviewPolicy.ISummary>(sortByCodeDescResult);

  const sortByCodeData = sortByCodeDescResult.data;

  const codeDefault = sortByCodeData.find((p) => p.code === defaultReview.code);
  const codeStrict = sortByCodeData.find(
    (p) => p.code === strictModeration.code,
  );
  const codeLenient = sortByCodeData.find((p) => p.code === lenientReview.code);

  TestValidator.predicate(
    "code-desc list should contain default review",
    codeDefault !== undefined,
  );
  TestValidator.predicate(
    "code-desc list should contain strict moderation",
    codeStrict !== undefined,
  );
  TestValidator.predicate(
    "code-desc list should contain lenient review",
    codeLenient !== undefined,
  );

  if (codeDefault && codeLenient && codeStrict) {
    const idxDefault = sortByCodeData.findIndex((p) => p.id === codeDefault.id);
    const idxLenient = sortByCodeData.findIndex((p) => p.id === codeLenient.id);
    const idxStrict = sortByCodeData.findIndex((p) => p.id === codeStrict.id);

    // In lexical descending order by code, strict_moderation_* > lenient_review_* > default_review_*
    TestValidator.predicate(
      "code desc: strict_moderation should come before lenient_review",
      idxStrict >= 0 && idxLenient >= 0 && idxStrict < idxLenient,
    );
    TestValidator.predicate(
      "code desc: lenient_review should come before default_review",
      idxLenient >= 0 && idxDefault >= 0 && idxLenient < idxDefault,
    );
  }
}
