import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";

/**
 * Test refund request search with filters that return no matching results.
 *
 * This scenario validates that the admin search endpoint properly handles cases
 * where filter criteria match no refund requests. Creates the basic
 * infrastructure (admin account) but does not create any refund requests. Then
 * performs searches with various filter combinations that would match no
 * records such as searching for non-existent buyer_id, filtering by future date
 * ranges, searching for status values with no matching requests, using amount
 * ranges outside any possible values, and text search terms that match no
 * refund reasons. Validates that the response returns empty data array, zero
 * record count, zero page count, but maintains proper pagination structure.
 *
 * Steps:
 *
 * 1. Create admin account for authentication
 * 2. Search with non-existent buyer_id filter
 * 3. Search with future date range (submitted_after tomorrow)
 * 4. Search with various status filters
 * 5. Search with high minimum amount filter
 * 6. Search with text search that matches nothing
 * 7. Validate all responses return empty results with proper pagination
 */
export async function test_api_refund_request_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
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

  // Step 2: Search with non-existent buyer_id filter
  const nonExistentBuyerId = typia.random<string & tags.Format<"uuid">>();
  const resultByBuyer: IPageIShoppingMallRefundRequest.ISummary =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: {
        page: 1,
        limit: 20,
        buyer_id: nonExistentBuyerId,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(resultByBuyer);

  TestValidator.equals(
    "empty data array for non-existent buyer",
    resultByBuyer.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for non-existent buyer",
    resultByBuyer.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-existent buyer",
    resultByBuyer.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1",
    resultByBuyer.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", resultByBuyer.pagination.limit, 20);

  // Step 3: Search with future date range (submitted_after tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const futureDate = tomorrow.toISOString();

  const resultByFutureDate: IPageIShoppingMallRefundRequest.ISummary =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: {
        page: 1,
        limit: 20,
        submitted_after: futureDate,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(resultByFutureDate);

  TestValidator.equals(
    "empty data for future date",
    resultByFutureDate.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for future date",
    resultByFutureDate.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for future date",
    resultByFutureDate.pagination.pages,
    0,
  );

  // Step 4: Search with various status filters
  const statuses: Array<
    | "requested"
    | "under_review"
    | "information_requested"
    | "approved"
    | "processing"
    | "completed"
    | "denied"
    | "cancelled"
  > = ["requested", "under_review", "approved", "completed", "denied"] as const;

  for (const status of statuses) {
    const resultByStatus: IPageIShoppingMallRefundRequest.ISummary =
      await api.functional.shoppingMall.admin.refundRequests.index(connection, {
        body: {
          page: 1,
          limit: 20,
          status: status,
        } satisfies IShoppingMallRefundRequest.IRequest,
      });
    typia.assert(resultByStatus);

    TestValidator.equals(
      `empty data for status ${status}`,
      resultByStatus.data.length,
      0,
    );
    TestValidator.equals(
      `zero records for status ${status}`,
      resultByStatus.pagination.records,
      0,
    );
    TestValidator.equals(
      `zero pages for status ${status}`,
      resultByStatus.pagination.pages,
      0,
    );
  }

  // Step 5: Search with high minimum amount filter
  const resultByHighAmount: IPageIShoppingMallRefundRequest.ISummary =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: {
        page: 1,
        limit: 20,
        min_amount: 999999999,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(resultByHighAmount);

  TestValidator.equals(
    "empty data for high amount",
    resultByHighAmount.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for high amount",
    resultByHighAmount.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for high amount",
    resultByHighAmount.pagination.pages,
    0,
  );

  // Step 6: Search with text search that matches nothing
  const resultBySearch: IPageIShoppingMallRefundRequest.ISummary =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: "xyznonexistentsearchterm999",
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(resultBySearch);

  TestValidator.equals(
    "empty data for search term",
    resultBySearch.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for search term",
    resultBySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for search term",
    resultBySearch.pagination.pages,
    0,
  );

  // Step 7: Search with non-existent order_id filter
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  const resultByOrder: IPageIShoppingMallRefundRequest.ISummary =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: {
        page: 1,
        limit: 20,
        order_id: nonExistentOrderId,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(resultByOrder);

  TestValidator.equals(
    "empty data for non-existent order",
    resultByOrder.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for non-existent order",
    resultByOrder.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-existent order",
    resultByOrder.pagination.pages,
    0,
  );

  // Step 8: Search with amount range that excludes all possible values
  const resultByAmountRange: IPageIShoppingMallRefundRequest.ISummary =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: {
        page: 1,
        limit: 20,
        min_amount: 1000000,
        max_amount: 1000001,
      } satisfies IShoppingMallRefundRequest.IRequest,
    });
  typia.assert(resultByAmountRange);

  TestValidator.equals(
    "empty data for narrow amount range",
    resultByAmountRange.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for narrow amount range",
    resultByAmountRange.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for narrow amount range",
    resultByAmountRange.pagination.pages,
    0,
  );
}
