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
 * Validate unified policy search pagination and sorting for platform admin.
 *
 * Business flow:
 *
 * 1. Join as a platform admin to obtain an authorized session.
 * 2. Create a shared policy setting profile.
 * 3. Seed multiple policies across all supported policy types (cancellation,
 *    refund, review, age restriction) so that unified search has enough data.
 * 4. Call the unified search endpoint with page=1, limit=5, sort_by="updatedAt",
 *    sort_direction="desc" and capture IDs from the first page.
 * 5. Call again with page=2 and the same sort parameters, then ensure no overlap
 *    between page 1 and page 2 and that combined unique IDs are consistent with
 *    pagination.records.
 * 6. Re-call page 1 and 2 with identical parameters to assert stable ordering.
 * 7. Optionally invert sort_direction to "asc" and verify that top results differ
 *    from the descending order call.
 */
export async function test_api_platform_admin_policy_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a shared policy setting profile
  const nowIso: string = new Date().toISOString();
  const policySettingCreate = {
    code: `policy_setting_${RandomGenerator.alphabets(6)}`,
    name: "Default Policy Profile",
    category: "cancellation",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: nowIso,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreate },
    );
  typia.assert(policySetting);

  // 3. Seed multiple policies across types
  const baseCodeSuffix = RandomGenerator.alphabets(4);

  // 3-1. Cancellation policies
  const cancellationPolicies: IShoppingMallCancellationPolicy[] = [];
  for (let i = 0; i < 5; i++) {
    const createBody = {
      code: `cancel_${baseCodeSuffix}_${i}`,
      name: `Cancellation Policy ${i}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      allow_cancellation_before_shipment: true,
      allow_partial_cancellation: i % 2 === 0,
      max_hours_after_payment: 24,
      config_payload: RandomGenerator.content({ paragraphs: 1 }),
      effective_from: nowIso,
      effective_to: null,
      active: true,
      region_code: null,
      policy_setting_code: policySetting.code,
    } satisfies IShoppingMallCancellationPolicy.ICreate;

    const created: IShoppingMallCancellationPolicy =
      await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
        connection,
        { body: createBody },
      );
    typia.assert(created);
    cancellationPolicies.push(created);
  }

  // 3-2. Refund policies
  const refundPolicies: IShoppingMallRefundPolicy[] = [];
  for (let i = 0; i < 5; i++) {
    const createBody = {
      code: `refund_${baseCodeSuffix}_${i}`,
      name: `Refund Policy ${i}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      allowFullRefund: true,
      allowPartialRefund: true,
      refundWindowDays: 30,
      maxRefundRate: 1,
      requireManualApprovalOverAmount: 100000,
      configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
      isActive: true,
      effectiveFrom: nowIso,
      effectiveUntil: null,
      regionCode: null,
      policySettingCode: policySetting.code,
    } satisfies IShoppingMallRefundPolicy.ICreate;

    const created: IShoppingMallRefundPolicy =
      await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
        connection,
        { body: createBody },
      );
    typia.assert(created);
    refundPolicies.push(created);
  }

  // 3-3. Review policies (3 entries)
  const reviewPolicies: IShoppingMallReviewPolicy[] = [];
  for (let i = 0; i < 3; i++) {
    const createBody = {
      code: `review_${baseCodeSuffix}_${i}`,
      name: `Review Policy ${i}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      max_days_after_delivery_for_review: 30,
      allow_edit_within_days: 7,
      auto_hide_report_threshold: 5,
      config_payload: RandomGenerator.content({ paragraphs: 1 }),
      active: true,
      effective_from: nowIso,
      effective_to: null,
      shopping_mall_region_setting_id: null,
      shopping_mall_policy_setting_id: policySetting.id,
    } satisfies IShoppingMallReviewPolicy.ICreate;

    const created: IShoppingMallReviewPolicy =
      await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
        connection,
        { body: createBody },
      );
    typia.assert(created);
    reviewPolicies.push(created);
  }

  // 3-4. Age restriction policies (3 entries)
  const agePolicies: IShoppingMallAgeRestrictionPolicy[] = [];
  for (let i = 0; i < 3; i++) {
    const createBody = {
      code: `age_${baseCodeSuffix}_${i}`,
      name: `Age Policy ${i}`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      minimum_age_years: 18,
      require_verified_age: i % 2 === 0,
      config_payload: RandomGenerator.content({ paragraphs: 1 }),
      active: true,
      effective_from: nowIso,
      effective_to: null,
      region_setting_id: null,
      policy_setting_id: policySetting.id,
    } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

    const created: IShoppingMallAgeRestrictionPolicy =
      await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
        connection,
        { body: createBody },
      );
    typia.assert(created);
    agePolicies.push(created);
  }

  const expectedSeedCount =
    cancellationPolicies.length +
    refundPolicies.length +
    reviewPolicies.length +
    agePolicies.length;

  // Helper to perform a policy search call
  const searchPolicies = async (
    page: number,
    sortDirection: "asc" | "desc",
  ): Promise<IPageIShoppingMallPolicySearchResult> => {
    const body: IShoppingMallPolicySearch.IRequest = {
      page,
      limit: 5,
      policy_types: undefined,
      statuses: undefined,
      effective_from: undefined,
      effective_to: undefined,
      region_codes: undefined,
      search: undefined,
      sort_by: "updatedAt",
      sort_direction: sortDirection,
    };
    const output =
      await api.functional.shoppingMall.platformAdmin.search.policies.index(
        connection,
        { body },
      );
    typia.assert(output);
    return output;
  };

  // 4. First page, descending
  const page1Desc: IPageIShoppingMallPolicySearchResult = await searchPolicies(
    1,
    "desc",
  );

  TestValidator.predicate(
    "page1 pagination.limit should be 5",
    page1Desc.pagination.limit === 5,
  );
  TestValidator.predicate(
    "page1 pagination.current should be 0 (zero-based index)",
    page1Desc.pagination.current === 0,
  );
  TestValidator.predicate(
    "page1 data length should be > 0 and <= 5",
    page1Desc.data.length > 0 && page1Desc.data.length <= 5,
  );

  const page1Ids = page1Desc.data.map((row) => row.policyId);
  const uniquePage1Ids = new Set(page1Ids);
  TestValidator.predicate(
    "page1 IDs should be unique",
    uniquePage1Ids.size === page1Ids.length,
  );

  // 5. Second page, descending
  const page2Desc: IPageIShoppingMallPolicySearchResult = await searchPolicies(
    2,
    "desc",
  );

  TestValidator.predicate(
    "page2 pagination.limit should be 5",
    page2Desc.pagination.limit === 5,
  );
  TestValidator.predicate(
    "page2 pagination.current should be 1 (zero-based index)",
    page2Desc.pagination.current === 1,
  );
  TestValidator.predicate(
    "page2 data length should be <= 5",
    page2Desc.data.length <= 5,
  );

  const page2Ids = page2Desc.data.map((row) => row.policyId);
  const uniquePage2Ids = new Set(page2Ids);
  TestValidator.predicate(
    "page2 IDs should be unique",
    uniquePage2Ids.size === page2Ids.length,
  );

  // Ensure no overlap between page 1 and page 2
  const overlap = page2Ids.filter((id) => uniquePage1Ids.has(id));
  TestValidator.predicate(
    "no overlapping policyId between page 1 and page 2",
    overlap.length === 0,
  );

  const allIds = new Set<string>([...page1Ids, ...page2Ids]);
  const totalRecords = page1Desc.pagination.records;
  TestValidator.predicate(
    "combined unique IDs from first two pages should not exceed total records",
    allIds.size <= totalRecords,
  );

  if (totalRecords >= expectedSeedCount) {
    TestValidator.predicate(
      "combined unique IDs should be at least expected seed count when enough records",
      allIds.size >= expectedSeedCount,
    );
  }

  // 6. Stability check: repeat same searches and compare IDs
  const page1DescAgain: IPageIShoppingMallPolicySearchResult =
    await searchPolicies(1, "desc");
  const page2DescAgain: IPageIShoppingMallPolicySearchResult =
    await searchPolicies(2, "desc");

  const page1IdsAgain = page1DescAgain.data.map((row) => row.policyId);
  const page2IdsAgain = page2DescAgain.data.map((row) => row.policyId);

  TestValidator.equals(
    "page1 IDs should be stable across repeated calls",
    page1Ids,
    page1IdsAgain,
  );
  TestValidator.equals(
    "page2 IDs should be stable across repeated calls",
    page2Ids,
    page2IdsAgain,
  );

  // 7. Optional sort direction inversion test (asc vs desc)
  const page1Asc: IPageIShoppingMallPolicySearchResult = await searchPolicies(
    1,
    "asc",
  );
  const page1AscIds = page1Asc.data.map((row) => row.policyId);

  TestValidator.predicate(
    "ascending vs descending sort should yield different ordering (if enough records)",
    page1AscIds.length === 0 || page1Ids.length === 0
      ? true
      : page1AscIds.some((id, index) => id !== page1Ids[index]),
  );
}
