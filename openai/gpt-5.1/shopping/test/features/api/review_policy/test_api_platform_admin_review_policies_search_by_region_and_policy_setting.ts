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
 * Validate review policy search by region and policy setting.
 *
 * 1. Join as a platform admin (auth.platformAdmin.join).
 * 2. Create two policy settings (review_default, review_strict).
 * 3. Create two region settings (US, EU).
 * 4. Create three review policies:
 *
 *    - US-Default: scoped to US + review_default profile.
 *    - EU-Strict: scoped to EU + review_strict profile.
 *    - Global-Default: global (no region) + review_default profile.
 * 5. Search with both region_setting_id = US and policy_setting_id = default and
 *    active = true, and expect only US-Default.
 * 6. Search with policy_setting_id = default and no region_setting_id and active =
 *    true, and expect US-Default and Global-Default, but not EU-Strict.
 */
export async function test_api_platform_admin_review_policies_search_by_region_and_policy_setting(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create policy settings
  const defaultPolicySettingBody = {
    code: `review_default_${RandomGenerator.alphaNumeric(6)}`,
    name: "Default Review Policy",
    category: "review",
    description: "Default review behavior",
    config_payload: null,
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const strictPolicySettingBody = {
    code: `review_strict_${RandomGenerator.alphaNumeric(6)}`,
    name: "Strict Review Policy",
    category: "review",
    description: "Strict review moderation",
    config_payload: null,
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const defaultPolicySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: defaultPolicySettingBody },
    );
  typia.assert(defaultPolicySetting);

  const strictPolicySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: strictPolicySettingBody },
    );
  typia.assert(strictPolicySetting);

  // 3. Create region settings
  const usRegionBody = {
    code: `US_${RandomGenerator.alphaNumeric(4)}`,
    name: "United States",
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const euRegionBody = {
    code: `EU_${RandomGenerator.alphaNumeric(4)}`,
    name: "European Union",
    iso_country_code: null,
    currency_code: "EUR",
    timezone: "Europe/Berlin",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const usRegion: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: usRegionBody },
    );
  typia.assert(usRegion);

  const euRegion: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: euRegionBody },
    );
  typia.assert(euRegion);

  // 4. Create review policies
  const usDefaultPolicyBody = {
    code: `US_DEFAULT_${RandomGenerator.alphaNumeric(6)}`,
    name: "US Default Review Policy",
    description: "US-scoped default review policy",
    max_days_after_delivery_for_review: 30 as number & tags.Type<"int32">,
    allow_edit_within_days: 7 as number & tags.Type<"int32">,
    auto_hide_report_threshold: 5 as number & tags.Type<"int32">,
    config_payload: null,
    active: true,
    effective_from: null,
    effective_to: null,
    shopping_mall_region_setting_id: usRegion.id,
    shopping_mall_policy_setting_id: defaultPolicySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const euStrictPolicyBody = {
    code: `EU_STRICT_${RandomGenerator.alphaNumeric(6)}`,
    name: "EU Strict Review Policy",
    description: "EU-scoped strict review policy",
    max_days_after_delivery_for_review: 14 as number & tags.Type<"int32">,
    allow_edit_within_days: 3 as number & tags.Type<"int32">,
    auto_hide_report_threshold: 2 as number & tags.Type<"int32">,
    config_payload: null,
    active: true,
    effective_from: null,
    effective_to: null,
    shopping_mall_region_setting_id: euRegion.id,
    shopping_mall_policy_setting_id: strictPolicySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const globalDefaultPolicyBody = {
    code: `GLOBAL_DEFAULT_${RandomGenerator.alphaNumeric(6)}`,
    name: "Global Default Review Policy",
    description: "Global default review policy with no region",
    max_days_after_delivery_for_review: 60 as number & tags.Type<"int32">,
    allow_edit_within_days: 10 as number & tags.Type<"int32">,
    auto_hide_report_threshold: 10 as number & tags.Type<"int32">,
    config_payload: null,
    active: true,
    effective_from: null,
    effective_to: null,
    shopping_mall_region_setting_id: null,
    shopping_mall_policy_setting_id: defaultPolicySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const usDefaultPolicy: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: usDefaultPolicyBody },
    );
  typia.assert(usDefaultPolicy);

  const euStrictPolicy: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: euStrictPolicyBody },
    );
  typia.assert(euStrictPolicy);

  const globalDefaultPolicy: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: globalDefaultPolicyBody },
    );
  typia.assert(globalDefaultPolicy);

  // 5. Search with region_setting_id = US and policy_setting_id = default
  const firstSearchBody = {
    search: undefined,
    code: undefined,
    active: true,
    region_setting_id: usRegion.id,
    policy_setting_id: defaultPolicySetting.id,
    effective_from_gte: undefined,
    effective_to_lte: undefined,
    max_days_after_delivery_for_review_min: undefined,
    max_days_after_delivery_for_review_max: undefined,
    allow_edit_within_days_min: undefined,
    allow_edit_within_days_max: undefined,
    auto_hide_report_threshold_min: undefined,
    auto_hide_report_threshold_max: undefined,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IShoppingMallReviewPolicy.IRequest;

  const firstPage: IPageIShoppingMallReviewPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.index(
      connection,
      { body: firstSearchBody },
    );
  typia.assert(firstPage);

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  TestValidator.predicate(
    "first search pagination.records should be >= 1",
    firstPagination.records >= 1,
  );
  TestValidator.predicate(
    "first search data length should be >= 1",
    firstData.length >= 1,
  );

  const includesUsDefault = firstData.some(
    (policy) => policy.id === usDefaultPolicy.id,
  );
  const includesEuStrict = firstData.some(
    (policy) => policy.id === euStrictPolicy.id,
  );
  const includesGlobalDefault = firstData.some(
    (policy) => policy.id === globalDefaultPolicy.id,
  );

  TestValidator.predicate(
    "first search should include US-Default policy only",
    includesUsDefault && !includesEuStrict && !includesGlobalDefault,
  );

  // 7. Search with only policy_setting_id = default (global + US)
  const secondSearchBody = {
    search: undefined,
    code: undefined,
    active: true,
    region_setting_id: undefined,
    policy_setting_id: defaultPolicySetting.id,
    effective_from_gte: undefined,
    effective_to_lte: undefined,
    max_days_after_delivery_for_review_min: undefined,
    max_days_after_delivery_for_review_max: undefined,
    allow_edit_within_days_min: undefined,
    allow_edit_within_days_max: undefined,
    auto_hide_report_threshold_min: undefined,
    auto_hide_report_threshold_max: undefined,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IShoppingMallReviewPolicy.IRequest;

  const secondPage: IPageIShoppingMallReviewPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.index(
      connection,
      { body: secondSearchBody },
    );
  typia.assert(secondPage);

  const secondPagination = secondPage.pagination;
  const secondData = secondPage.data;

  // Pagination sanity checks
  TestValidator.predicate(
    "second search current page index should be >= 0",
    secondPagination.current >= 0,
  );
  TestValidator.predicate(
    "second search limit should be >= data length",
    secondPagination.limit >= secondData.length,
  );
  TestValidator.predicate(
    "second search records should be >= data length",
    secondPagination.records >= secondData.length,
  );
  TestValidator.predicate(
    "second search pages should be >= 1 when there are records",
    secondPagination.records === 0 || secondPagination.pages >= 1,
  );

  const secondIncludesUsDefault = secondData.some(
    (policy) => policy.id === usDefaultPolicy.id,
  );
  const secondIncludesGlobalDefault = secondData.some(
    (policy) => policy.id === globalDefaultPolicy.id,
  );
  const secondIncludesEuStrict = secondData.some(
    (policy) => policy.id === euStrictPolicy.id,
  );

  TestValidator.predicate(
    "second search should include US-Default and Global-Default but not EU-Strict",
    secondIncludesUsDefault &&
      secondIncludesGlobalDefault &&
      !secondIncludesEuStrict,
  );
}
