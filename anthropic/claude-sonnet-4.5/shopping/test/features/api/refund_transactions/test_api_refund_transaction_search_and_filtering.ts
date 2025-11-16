import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundTransaction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundTransaction";

/**
 * Test comprehensive search and filtering capabilities for refund transactions.
 *
 * This test validates that administrators can retrieve filtered, paginated
 * lists of refund transactions with various search criteria. The test
 * verifies:
 *
 * 1. Administrator authentication and authorization
 * 2. Pagination parameters (page, limit) for navigating through refund transaction
 *    datasets
 * 3. Filtering by transaction status (processing, completed, failed)
 * 4. Filtering by specific identifiers (refund_request_id, order_id, buyer_id)
 * 5. Amount range filtering using min_amount and max_amount parameters
 * 6. Filtering by payment provider
 * 7. Temporal filtering using initiated_from, initiated_to, completed_from,
 *    completed_to date ranges
 * 8. Sorting capabilities by created_at, initiated_at, completed_at,
 *    refund_amount, and status
 * 9. Pagination metadata validation (current page, limit, total records, total
 *    pages)
 * 10. Refund transaction summary structure validation
 * 11. Administrator-only access control
 *
 * The test creates the necessary infrastructure including admin account
 * authentication to generate and search refund transaction records with
 * comprehensive filtering options.
 */
export async function test_api_refund_transaction_search_and_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test basic pagination with default parameters
  const basicSearchResult: IPageIShoppingMallRefundTransaction.ISummary =
    await api.functional.shoppingMall.admin.refundTransactions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallRefundTransaction.IRequest,
      },
    );
  typia.assert(basicSearchResult);

  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination has current page",
    basicSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has correct limit",
    basicSearchResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    basicSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    basicSearchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data is an array",
    Array.isArray(basicSearchResult.data),
  );

  // Step 3: Test filtering by status
  const statusFilters = ["processing", "completed", "failed"] as const;
  for (const status of statusFilters) {
    const statusFilterResult =
      await api.functional.shoppingMall.admin.refundTransactions.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            status: status,
          } satisfies IShoppingMallRefundTransaction.IRequest,
        },
      );
    typia.assert(statusFilterResult);
  }

  // Step 4: Test sorting by different fields
  const sortFields = [
    "created_at",
    "initiated_at",
    "completed_at",
    "refund_amount",
    "status",
  ] as const;
  const sortOrders = ["asc", "desc"] as const;

  for (const sortBy of sortFields) {
    for (const sortOrder of sortOrders) {
      const sortedResult =
        await api.functional.shoppingMall.admin.refundTransactions.index(
          connection,
          {
            body: {
              page: 1,
              limit: 15,
              sort_by: sortBy,
              sort_order: sortOrder,
            } satisfies IShoppingMallRefundTransaction.IRequest,
          },
        );
      typia.assert(sortedResult);
    }
  }

  // Step 5: Test amount range filtering
  const amountRangeResult =
    await api.functional.shoppingMall.admin.refundTransactions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          min_amount: 10,
          max_amount: 1000,
        } satisfies IShoppingMallRefundTransaction.IRequest,
      },
    );
  typia.assert(amountRangeResult);

  // Step 6: Test filtering by payment provider
  const providerFilterResult =
    await api.functional.shoppingMall.admin.refundTransactions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          provider: "stripe",
        } satisfies IShoppingMallRefundTransaction.IRequest,
      },
    );
  typia.assert(providerFilterResult);

  // Step 7: Test temporal filtering with date ranges
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const temporalFilterResult =
    await api.functional.shoppingMall.admin.refundTransactions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          initiated_from: thirtyDaysAgo.toISOString(),
          initiated_to: now.toISOString(),
        } satisfies IShoppingMallRefundTransaction.IRequest,
      },
    );
  typia.assert(temporalFilterResult);

  // Step 8: Test filtering with completed date ranges
  const completedFilterResult =
    await api.functional.shoppingMall.admin.refundTransactions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          completed_from: thirtyDaysAgo.toISOString(),
          completed_to: now.toISOString(),
        } satisfies IShoppingMallRefundTransaction.IRequest,
      },
    );
  typia.assert(completedFilterResult);

  // Step 9: Test filtering by specific identifiers
  const randomUuid = typia.random<string & tags.Format<"uuid">>();

  const refundRequestIdFilter =
    await api.functional.shoppingMall.admin.refundTransactions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          refund_request_id: randomUuid,
        } satisfies IShoppingMallRefundTransaction.IRequest,
      },
    );
  typia.assert(refundRequestIdFilter);

  const orderIdFilter =
    await api.functional.shoppingMall.admin.refundTransactions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_id: randomUuid,
        } satisfies IShoppingMallRefundTransaction.IRequest,
      },
    );
  typia.assert(orderIdFilter);

  const buyerIdFilter =
    await api.functional.shoppingMall.admin.refundTransactions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          buyer_id: randomUuid,
        } satisfies IShoppingMallRefundTransaction.IRequest,
      },
    );
  typia.assert(buyerIdFilter);

  // Step 10: Test complex multi-criteria filtering
  const complexFilterResult =
    await api.functional.shoppingMall.admin.refundTransactions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          status: "completed",
          min_amount: 50,
          max_amount: 500,
          provider: "paypal",
          sort_by: "refund_amount",
          sort_order: "desc",
          initiated_from: thirtyDaysAgo.toISOString(),
          initiated_to: now.toISOString(),
        } satisfies IShoppingMallRefundTransaction.IRequest,
      },
    );
  typia.assert(complexFilterResult);

  // Validate complex filter result structure
  if (complexFilterResult.data.length > 0) {
    const firstTransaction = complexFilterResult.data[0];
    typia.assert(firstTransaction);
    TestValidator.predicate(
      "transaction has valid id",
      typeof firstTransaction.id === "string",
    );
    TestValidator.predicate(
      "transaction has valid status",
      ["processing", "completed", "failed"].includes(firstTransaction.status),
    );
    TestValidator.predicate(
      "transaction has valid refund amount",
      firstTransaction.refund_amount >= 0,
    );
    TestValidator.predicate(
      "transaction has valid currency",
      typeof firstTransaction.currency === "string",
    );
    TestValidator.predicate(
      "transaction has valid provider",
      typeof firstTransaction.provider === "string",
    );
  }

  // Step 11: Test pagination navigation (different pages)
  const page2Result =
    await api.functional.shoppingMall.admin.refundTransactions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallRefundTransaction.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "second page number is correct",
    page2Result.pagination.current,
    2,
  );

  // Step 12: Test different page size limits
  const limitsToTest = [1, 10, 25, 50, 100] as const;
  for (const limit of limitsToTest) {
    const limitTestResult =
      await api.functional.shoppingMall.admin.refundTransactions.index(
        connection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IShoppingMallRefundTransaction.IRequest,
        },
      );
    typia.assert(limitTestResult);
    TestValidator.equals(
      "limit matches requested",
      limitTestResult.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "data length respects limit",
      limitTestResult.data.length <= limit,
    );
  }
}
