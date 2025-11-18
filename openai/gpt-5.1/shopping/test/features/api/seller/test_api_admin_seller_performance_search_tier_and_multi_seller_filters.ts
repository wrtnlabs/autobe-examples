import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPerformanceSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceSnapshot";

export async function test_api_admin_seller_performance_search_tier_and_multi_seller_filters(
  connection: api.IConnection,
) {
  // 1. Arrange: register an admin and establish authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Act: perform a baseline unfiltered search to confirm basic behavior
  const baselineRequest = {
    // no sellerId / sellerIds / tiers so that we see general population
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  const baselinePage: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerPerformance.index(
      connection,
      { body: baselineRequest },
    );
  typia.assert(baselinePage);

  // Basic pagination sanity checks
  const baselinePagination = baselinePage.pagination;
  TestValidator.predicate(
    "baseline: pagination current is non-negative",
    baselinePagination.current >= 0,
  );
  TestValidator.predicate(
    "baseline: pagination limit is positive or zero",
    baselinePagination.limit >= 0,
  );
  TestValidator.predicate(
    "baseline: pagination records non-negative",
    baselinePagination.records >= 0,
  );
  TestValidator.predicate(
    "baseline: pagination pages non-negative",
    baselinePagination.pages >= 0,
  );
  TestValidator.predicate(
    "baseline: data length not exceeding limit",
    baselinePage.data.length <= baselinePagination.limit,
  );

  // 3. If we have some data, build a focused filter on a subset of sellers and tiers
  if (baselinePage.data.length > 0) {
    // Collect up to 3 distinct seller IDs from baseline data
    const distinctSellerIds: string[] = [];
    for (const row of baselinePage.data) {
      const sellerId = row.seller.id;
      if (!distinctSellerIds.includes(sellerId)) {
        distinctSellerIds.push(sellerId);
      }
      if (distinctSellerIds.length >= 3) break;
    }

    // Derive tiers observed in the baseline data (non-null only)
    const distinctTiers: string[] = [];
    for (const row of baselinePage.data) {
      if (row.tier !== null && row.tier !== undefined) {
        if (!distinctTiers.includes(row.tier)) {
          distinctTiers.push(row.tier);
        }
      }
    }

    // Build sellerIds filter using at least two seller IDs when possible
    const filteredSellerIds: (string & tags.Format<"uuid">)[] =
      distinctSellerIds.length >= 2
        ? (distinctSellerIds.slice(0, 2) as (string & tags.Format<"uuid">)[])
        : (distinctSellerIds as (string & tags.Format<"uuid">)[]);

    // Build tiers filter using up to two tiers when possible; if none exist, leave tiers undefined
    const filteredTiers: string[] | undefined =
      distinctTiers.length === 0
        ? undefined
        : distinctTiers.slice(0, Math.min(2, distinctTiers.length));

    const filteredRequest = {
      sellerIds: filteredSellerIds.length > 0 ? filteredSellerIds : undefined,
      tiers: filteredTiers,
      snapshotDateFrom: undefined,
      snapshotDateTo: undefined,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

    const filteredPage: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
      await api.functional.shoppingMall.admin.analytics.sellerPerformance.index(
        connection,
        { body: filteredRequest },
      );
    typia.assert(filteredPage);

    const filteredPagination = filteredPage.pagination;
    TestValidator.predicate(
      "filtered: pagination records non-negative",
      filteredPagination.records >= 0,
    );
    TestValidator.predicate(
      "filtered: data length less than or equal to limit",
      filteredPage.data.length <= filteredPagination.limit,
    );

    // For each row, verify seller.id and tier constraints relative to the filters
    for (const row of filteredPage.data) {
      if (filteredRequest.sellerIds !== undefined) {
        TestValidator.predicate(
          "filtered: row seller.id is within requested sellerIds",
          filteredRequest.sellerIds.includes(row.seller.id),
        );
      }
      if (filteredRequest.tiers !== undefined) {
        if (row.tier !== null && row.tier !== undefined) {
          TestValidator.predicate(
            "filtered: row tier is within requested tiers when non-null",
            filteredRequest.tiers.includes(row.tier),
          );
        }
      }
    }

    // If we requested at least one sellerId and at least one tier and baseline suggested non-empty
    if (
      filteredRequest.sellerIds !== undefined &&
      filteredRequest.sellerIds.length > 0 &&
      filteredRequest.tiers !== undefined &&
      filteredRequest.tiers.length > 0
    ) {
      TestValidator.predicate(
        "filtered: when using observed sellerIds and tiers, data should not be empty",
        filteredPage.data.length > 0,
      );
    }
  }

  // 4. Negative case: construct a filter combination that is very unlikely to match anything
  const impossibleSellerIds: (string & tags.Format<"uuid">)[] = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const impossibleTiers: string[] = [
    "high_risk_unlikely_tier_value",
    "premium_unlikely_tier_value",
  ];

  const impossibleRequest = {
    sellerIds: impossibleSellerIds,
    tiers: impossibleTiers,
    snapshotDateFrom: undefined,
    snapshotDateTo: undefined,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  const impossiblePage: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerPerformance.index(
      connection,
      { body: impossibleRequest },
    );
  typia.assert(impossiblePage);

  TestValidator.predicate(
    "impossible: data array should be empty or at least valid with non-negative records",
    impossiblePage.data.length === 0 && impossiblePage.pagination.records >= 0,
  );
}
