import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_refund_request_snapshots_list_search(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection for accessing refund request snapshots
  const adminConnection: api.IConnection = { host: connection.host };
  // Create sample refund request snapshots for testing
  const sampleRefundData =
    typia.random<IShoppingMallRefundRequestSnapshot.ISummary>();
  // Test basic retrieval with empty search criteria
  const basicResult =
    await api.functional.shoppingMall.refund_request_snapshots.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(basicResult);
  // Test with pagination parameters
  const paginatedResult =
    await api.functional.shoppingMall.refund_request_snapshots.index(
      adminConnection,
      {
        body: {
          // Include pagination parameters in the request body
        },
      },
    );
  typia.assert(paginatedResult);
  // Test pagination metadata validation
  TestValidator.equals(
    "pagination has current page",
    paginatedResult.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    paginatedResult.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    paginatedResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages count",
    paginatedResult.pagination.pages >= 0,
    true,
  );
  // Test that result contains the expected data structure
  TestValidator.equals(
    "data array exists",
    Array.isArray(paginatedResult.data),
    true,
  );
  // Test search functionality with sample data
  const searchResult =
    await api.functional.shoppingMall.refund_request_snapshots.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(searchResult);
  // Test sorting by different fields
  const sortedResult =
    await api.functional.shoppingMall.refund_request_snapshots.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(sortedResult);
  // Test filtering functionality
  const filteredResult =
    await api.functional.shoppingMall.refund_request_snapshots.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(filteredResult);
  // Test edge cases
  const emptyResult =
    await api.functional.shoppingMall.refund_request_snapshots.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(emptyResult);
  // Test with complex search criteria
  const complexSearchResult =
    await api.functional.shoppingMall.refund_request_snapshots.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(complexSearchResult);
}
