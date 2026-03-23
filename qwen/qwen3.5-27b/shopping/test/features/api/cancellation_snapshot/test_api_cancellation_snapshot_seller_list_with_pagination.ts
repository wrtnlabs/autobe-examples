import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationSnapshot";
import type { IShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_cancellation_snapshot_seller_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an authenticated seller can retrieve a paginated list of their cancellation request snapshots.
   * Verifies pagination parameters, response structure, and data isolation for seller-specific snapshots.
   */
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Request paginated cancellation snapshots (page 1, limit 10)
  const page1Response =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current matches request",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page1Response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page1Response.pagination.pages >= 0,
  );
  // 4. Validate pages calculation (should be ceiling of records/limit)
  const expectedPages =
    page1Response.pagination.records === 0
      ? 0
      : Math.ceil(page1Response.pagination.records / 10);
  TestValidator.equals(
    "pagination pages calculated correctly",
    page1Response.pagination.pages,
    expectedPages,
  );
  // 5. Validate data array structure
  TestValidator.predicate(
    "data is an array",
    Array.isArray(page1Response.data),
  );
  TestValidator.equals(
    "data length matches pagination on first page",
    page1Response.data.length,
    Math.min(10, page1Response.pagination.records),
  );
  // 6. Validate each snapshot has unique IDs (business logic, not type validation)
  const snapshotIds = new Set<string>();
  for (const snapshot of page1Response.data) {
    TestValidator.predicate(
      `snapshot id is unique: ${snapshot.id}`,
      !snapshotIds.has(snapshot.id),
    );
    snapshotIds.add(snapshot.id);
    // Verify cancellation request ID is present and non-empty (business logic)
    TestValidator.predicate(
      `snapshot has cancellation request reference: ${snapshot.cancellationRequestId}`,
      snapshot.cancellationRequestId.length > 0,
    );
  }
  // 7. Test with different pagination parameters (page 2, limit 5)
  const page2Response =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  // 8. Validate second page pagination
  TestValidator.equals(
    "page 2 pagination current",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit",
    page2Response.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "page 2 records is non-negative",
    page2Response.pagination.records >= 0,
  );
  // 9. Validate that total records count is consistent across requests
  TestValidator.equals(
    "total records consistent across pagination requests",
    page1Response.pagination.records,
    page2Response.pagination.records,
  );
  // 10. Test edge case: page beyond available data
  const largePageResponse =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      {
        body: {
          page: 9999,
          limit: 10,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(largePageResponse);
  // 11. Validate empty response for non-existent page
  TestValidator.equals(
    "large page returns empty data",
    largePageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "large page pagination current",
    largePageResponse.pagination.current,
    9999,
  );
  TestValidator.equals(
    "large page pagination limit",
    largePageResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "large page records is non-negative",
    largePageResponse.pagination.records >= 0,
  );
  // 12. Test with sorting parameters
  const sortedResponse =
    await api.functional.shoppingMall.seller.cancellationSnapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(sortedResponse);
  // 13. Validate sorted response structure
  TestValidator.equals(
    "sorted response pagination current",
    sortedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "sorted response pagination limit",
    sortedResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "sorted response data is array",
    Array.isArray(sortedResponse.data),
  );
}
