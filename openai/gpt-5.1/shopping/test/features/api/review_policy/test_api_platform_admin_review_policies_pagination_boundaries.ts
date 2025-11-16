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
 * Validate pagination boundary behavior for platform admin review policy
 * search.
 *
 * Business goal: Ensure that PATCH /shoppingMall/platformAdmin/reviewPolicies
 * correctly handles normal and out-of-range pagination requests for platform
 * administrators. The test seeds enough review policies to span multiple pages,
 * then verifies that pagination metadata and page contents behave coherently
 * when requesting the first, middle, and out-of-range pages.
 *
 * Steps:
 *
 * 1. Register and authenticate a platform admin via POST /auth/platformAdmin/join.
 * 2. Create a region setting and a policy setting profile.
 * 3. Seed multiple review policies (>= 12) referencing those settings.
 * 4. Call PATCH /shoppingMall/platformAdmin/reviewPolicies with limit=5 to get the
 *    first page and validate pagination metadata and data size.
 * 5. Call again with page=2, limit=5 to fetch the second page and ensure it is
 *    distinct from the first page where possible.
 * 6. Call again with page set beyond the last page (pages+2) to confirm that the
 *    API does not error and that pagination metadata remains logically
 *    consistent even when the requested page is out of range.
 */
export async function test_api_platform_admin_review_policies_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register platform admin
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create region setting
  const regionBody = {
    code: `REGION_${RandomGenerator.alphabets(5)}`,
    name: RandomGenerator.name(2),
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

  // 3. Create policy setting profile
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveTo = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const policySettingBody = {
    code: `POLICY_${RandomGenerator.alphabets(6)}`,
    name: "Review Policy Profile",
    category: "review",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    config_payload: JSON.stringify({ maxReports: 3 }),
    active: true,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingBody },
    );
  typia.assert(policySetting);

  // 3. Seed multiple review policies (e.g., 12)
  const seedCount = 12;
  const createdPolicies: IShoppingMallReviewPolicy[] = [];

  for (let i = 0; i < seedCount; i++) {
    const body = {
      code: `REV_${RandomGenerator.alphabets(6)}_${i}`,
      name: `Review Policy ${i + 1}`,
      description: RandomGenerator.paragraph({ sentences: 6 }),
      max_days_after_delivery_for_review: 30,
      allow_edit_within_days: 7,
      auto_hide_report_threshold: 5,
      config_payload: JSON.stringify({ level: i % 3 }),
      active: true,
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
      shopping_mall_region_setting_id: region.id,
      shopping_mall_policy_setting_id: policySetting.id,
    } satisfies IShoppingMallReviewPolicy.ICreate;

    const created: IShoppingMallReviewPolicy =
      await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
        connection,
        { body },
      );
    typia.assert(created);
    createdPolicies.push(created);
  }

  TestValidator.predicate(
    "seeded policies count should be at least 1",
    createdPolicies.length >= 1,
  );

  // Helper to compute expected pages
  const computePages = (records: number, limit: number): number => {
    if (records === 0) return 0;
    const safeLimit = limit > 0 ? limit : 1;
    return Math.ceil(records / safeLimit);
  };

  // 4. First page: omit page, limit = 5
  const limit = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const firstPageRequest = {
    limit,
  } satisfies IShoppingMallReviewPolicy.IRequest;

  const firstPage: IPageIShoppingMallReviewPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.index(
      connection,
      { body: firstPageRequest },
    );
  typia.assert(firstPage);

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  TestValidator.equals(
    "first page limit should be 5",
    firstPagination.limit,
    limit,
  );
  TestValidator.predicate(
    "first page records should be at least seeded count",
    firstPagination.records >= createdPolicies.length,
  );
  TestValidator.predicate(
    "first page data length should be > 0 and <= limit when records > 0",
    firstPagination.records === 0
      ? firstData.length === 0
      : firstData.length > 0 && firstData.length <= limit,
  );

  const expectedPages = computePages(
    firstPagination.records,
    firstPagination.limit,
  );
  TestValidator.equals(
    "pages should match ceil(records / limit)",
    firstPagination.pages,
    expectedPages,
  );

  const firstPageIds = firstData.map((p) => p.id);

  // 5. Second page: page = 2, limit = 5
  const secondPageRequest = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies IShoppingMallReviewPolicy.IRequest;

  const secondPage: IPageIShoppingMallReviewPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.index(
      connection,
      { body: secondPageRequest },
    );
  typia.assert(secondPage);

  const secondPagination = secondPage.pagination;
  const secondData = secondPage.data;

  // For page=2 (1-based), expect current (0-based) to be 1 when there are enough pages
  if (secondPagination.pages >= 2) {
    TestValidator.equals(
      "second page current index should be 1 when pages >= 2",
      secondPagination.current,
      1,
    );
  }

  TestValidator.predicate(
    "second page data length should be <= limit",
    secondData.length <= limit,
  );

  if (firstPagination.records >= 2 * limit) {
    // When there are at least 2 full pages, no ID on page 2 should overlap page 1
    const secondIds = secondData.map((p) => p.id);
    const hasOverlap = secondIds.some((id) => firstPageIds.includes(id));
    TestValidator.predicate(
      "first and second page IDs should not overlap when there are >= 2 full pages",
      hasOverlap === false,
    );
  }

  // 6. Out-of-range page request: page = pages + 2 (ensure >= 1)
  const pages = firstPagination.pages;
  const outOfRangePageNumber = (pages + 2) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const outRequest = {
    page: outOfRangePageNumber,
    limit,
  } satisfies IShoppingMallReviewPolicy.IRequest;

  const outPage: IPageIShoppingMallReviewPolicy.ISummary =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.index(
      connection,
      { body: outRequest },
    );
  typia.assert(outPage);

  const outPagination = outPage.pagination;
  const outData = outPage.data;

  // Records and pages should remain consistent with first page
  TestValidator.equals(
    "out-of-range records should equal initial records",
    outPagination.records,
    firstPagination.records,
  );
  TestValidator.equals(
    "out-of-range pages should equal initial pages",
    outPagination.pages,
    firstPagination.pages,
  );
  TestValidator.equals(
    "out-of-range limit should equal initial limit",
    outPagination.limit,
    firstPagination.limit,
  );

  // Behavior can either clamp to last page or return empty data; both are valid
  TestValidator.predicate(
    "out-of-range page data length should be 0 or <= limit",
    outData.length === 0 || outData.length <= limit,
  );
}
