import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategorySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_snapshots_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate test data with specific filters
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  // Test 1: Filter by category ID only
  const categoryIdFilterRequest = {
    ecommerce_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 50,
  } satisfies IEcommerceMallCategorySnapshot.IRequest;
  const categoryIdResponse =
    await api.functional.ecommerceMall.category_snapshots.index(
      adminConnection,
      {
        body: categoryIdFilterRequest,
      },
    );
  typia.assert(categoryIdResponse);
  TestValidator.equals(
    "category ID filter returns matching snapshots",
    categoryIdResponse.data.every(
      (snapshot) =>
        snapshot.id === categoryIdFilterRequest.ecommerce_mall_category_id,
    ),
    true,
  );
  // Test 2: Filter by date range (snapshot_created_at)
  const dateRangeFilterRequest = {
    snapshot_created_at_from: threeDaysAgo.toISOString(),
    snapshot_created_at_to: now.toISOString(),
    page: 1,
    limit: 50,
  } satisfies IEcommerceMallCategorySnapshot.IRequest;
  const dateRangeResponse =
    await api.functional.ecommerceMall.category_snapshots.index(
      adminConnection,
      {
        body: dateRangeFilterRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Verify all snapshots fall within date range (inclusive boundaries)
  dateRangeResponse.data.forEach((snapshot) => {
    const snapshotTime = new Date(snapshot.snapshot_created_at);
    const fromDate = new Date(dateRangeFilterRequest.snapshot_created_at_from!);
    const toDate = new Date(dateRangeFilterRequest.snapshot_created_at_to!);
    TestValidator.predicate(
      "snapshot_created_at within range (inclusive start)",
      snapshotTime >= fromDate,
    );
    TestValidator.predicate(
      "snapshot_created_at within range (inclusive end)",
      snapshotTime <= toDate,
    );
  });
  // Test 3: Filter by is_leaf status
  const leafFilterRequest = {
    is_leaf: true,
    page: 1,
    limit: 50,
  } satisfies IEcommerceMallCategorySnapshot.IRequest;
  const leafFilterResponse =
    await api.functional.ecommerceMall.category_snapshots.index(
      adminConnection,
      {
        body: leafFilterRequest,
      },
    );
  typia.assert(leafFilterResponse);
  // Verify all returned snapshots have is_leaf === true
  TestValidator.equals(
    "is_leaf filter returns only leaf categories",
    leafFilterResponse.data.every((snapshot) => snapshot.is_leaf === true),
    true,
  );
  // Test 4: Combined filters (category ID + date range + is_leaf)
  const combinedFilterRequest = {
    ecommerce_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
    snapshot_created_at_from: oneDayAgo.toISOString(),
    snapshot_created_at_to: now.toISOString(),
    is_leaf: false,
    page: 1,
    limit: 50,
  } satisfies IEcommerceMallCategorySnapshot.IRequest;
  const combinedFilterResponse =
    await api.functional.ecommerceMall.category_snapshots.index(
      adminConnection,
      {
        body: combinedFilterRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Verify all snapshots match ALL filter criteria (AND logic)
  combinedFilterResponse.data.forEach((snapshot) => {
    const snapshotTime = new Date(snapshot.snapshot_created_at);
    const fromDate = new Date(combinedFilterRequest.snapshot_created_at_from!);
    const toDate = new Date(combinedFilterRequest.snapshot_created_at_to!);
    TestValidator.equals(
      "combined filter - category ID matches",
      snapshot.id === combinedFilterRequest.ecommerce_mall_category_id,
      true,
    );
    TestValidator.predicate(
      "combined filter - snapshot_created_at within range",
      snapshotTime >= fromDate && snapshotTime <= toDate,
    );
    TestValidator.equals(
      "combined filter - is_leaf matches",
      snapshot.is_leaf === combinedFilterRequest.is_leaf,
      true,
    );
  });
  // Test 5: Verify pagination metadata reflects filtered result counts
  const paginationFilterRequest = {
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallCategorySnapshot.IRequest;
  const paginationResponse =
    await api.functional.ecommerceMall.category_snapshots.index(
      adminConnection,
      {
        body: paginationFilterRequest,
      },
    );
  typia.assert(paginationResponse);
  // Verify pagination metadata is accurate
  TestValidator.equals(
    "pagination - current page",
    paginationResponse.pagination.current,
    paginationFilterRequest.page,
  );
  TestValidator.equals(
    "pagination - limit",
    paginationResponse.pagination.limit,
    paginationFilterRequest.limit,
  );
  TestValidator.equals(
    "pagination - records count",
    paginationResponse.pagination.records,
    paginationResponse.data.length,
  );
  TestValidator.equals(
    "pagination - pages calculation",
    paginationResponse.pagination.pages,
    Math.ceil(
      paginationResponse.pagination.records /
        paginationResponse.pagination.limit,
    ),
  );
}
