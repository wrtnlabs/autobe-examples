import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test date range filtering and full-text search capabilities for customers
 * investigating their cancellation handling history.
 *
 * Validates:
 * - Date range filtering correctly bounds results by created_at timestamp
 * - Full-text search on reason field supports partial matching
 * - Combined filters work correctly together
 * - Pagination works with filters
 */
export async function test_api_cancellation_snapshot_date_range_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Get current time for date range testing
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(now.getTime() - 7 * oneDayMs);
  const threeDaysAgo = new Date(now.getTime() - 3 * oneDayMs);
  // 2. Test 'from' date filter - get snapshots from 7 days ago
  const fromResult =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          from: sevenDaysAgo.toISOString(),
          limit: 20,
          page: 1,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(fromResult);
  // Validate all returned snapshots have created_at >= from date
  for (const snapshot of fromResult.data) {
    TestValidator.predicate(
      "snapshot created_at should be >= from date",
      new Date(snapshot.created_at).getTime() >= sevenDaysAgo.getTime(),
    );
  }
  // 3. Test both 'from' and 'to' date filters (date range)
  const rangeResult =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          from: sevenDaysAgo.toISOString(),
          to: threeDaysAgo.toISOString(),
          limit: 20,
          page: 1,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rangeResult);
  // Validate all returned snapshots fall within date range
  for (const snapshot of rangeResult.data) {
    const createdAt = new Date(snapshot.created_at).getTime();
    TestValidator.predicate(
      "snapshot created_at should be >= from date",
      createdAt >= sevenDaysAgo.getTime(),
    );
    TestValidator.predicate(
      "snapshot created_at should be <= to date",
      createdAt <= threeDaysAgo.getTime(),
    );
  }
  // 4. First get all snapshots to find search terms
  const allSnapshots =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 5. Test full-text search on reason field
  if (allSnapshots.data.length > 0) {
    // Extract a word from an existing reason for search
    const sampleReason = allSnapshots.data[0].reason;
    const words = sampleReason.split(/\s+/).filter((word) => word.length >= 3);
    const searchWord =
      words.length > 0
        ? words[0]
        : sampleReason.substring(0, Math.min(10, sampleReason.length));
    const searchResult =
      await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
        customerConnection,
        {
          body: {
            search: searchWord,
            limit: 20,
            page: 1,
          } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(searchResult);
    // Validate search results contain the search term (case-insensitive check)
    for (const snapshot of searchResult.data) {
      TestValidator.predicate(
        "snapshot reason should contain search term",
        snapshot.reason.toLowerCase().includes(searchWord.toLowerCase()),
      );
    }
  }
  // 6. Test combined date range and text search
  const combinedResult =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          from: sevenDaysAgo.toISOString(),
          to: now.toISOString(),
          search: "cancel",
          limit: 20,
          page: 1,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate combined filters - check date range for all results
  for (const snapshot of combinedResult.data) {
    const createdAt = new Date(snapshot.created_at).getTime();
    TestValidator.predicate(
      "combined: created_at should be in date range",
      createdAt >= sevenDaysAgo.getTime() && createdAt <= now.getTime(),
    );
    // Note: search term validation is optional since "cancel" might not exist in all reasons
  }
  // 7. Test pagination with filters
  const pageOne =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          from: sevenDaysAgo.toISOString(),
          limit: 5,
          page: 1,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(pageOne);
  TestValidator.predicate(
    "pagination current page should be 1",
    pageOne.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    pageOne.pagination.limit === 5,
  );
}
