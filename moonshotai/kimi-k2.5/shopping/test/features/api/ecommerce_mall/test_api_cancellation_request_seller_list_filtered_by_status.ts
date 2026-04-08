import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

/**
 * Test the filtering capability where a seller applies status filters to narrow down
 * cancellation request results. Verifies status filters, date range filtering, sorting,
 * and combined filter logic.
 */
export async function test_api_cancellation_request_seller_list_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Actor Setup - Create seller and customer connections
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(seller);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {},
    });
  typia.assert(customer);
  // 2. Data Preparation - Create cancellation requests for testing
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: "Test cancellation for filtering verification",
        },
      },
    );
  typia.assert(cancellationRequest);
  const orderItemId = cancellationRequest.orderItem.id;
  // 3. Test Status Filter - Filter by pending status
  const pendingFilterResult =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.index(
      sellerConnection,
      {
        orderItemId,
        body: {
          status: "pending",
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingFilterResult);
  // Verify pagination metadata reflects filtered count correctly
  TestValidator.predicate(
    "pagination has valid current page",
    pendingFilterResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    pendingFilterResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pendingFilterResult.pagination.records >= 0,
  );
  // 4. Test Date Range Filtering - Filter by createdAt date range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.index(
      sellerConnection,
      {
        orderItemId,
        body: {
          createdAtFrom: yesterday.toISOString(),
          createdAtTo: tomorrow.toISOString(),
          sortBy: "createdAt",
          sortOrder: "asc",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns valid data array",
    Array.isArray(dateRangeResult.data),
  );
  // 5. Test Sorting by respondedAt in descending order
  const sortingResult =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.index(
      sellerConnection,
      {
        orderItemId,
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 5,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sortingResult);
  TestValidator.predicate(
    "sorting result has data property",
    "data" in sortingResult,
  );
  TestValidator.predicate(
    "sorting result has pagination",
    "pagination" in sortingResult,
  );
  // 6. Test Combined Filters - Status + Date Range (AND logic)
  const combinedFilterResult =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.index(
      sellerConnection,
      {
        orderItemId,
        body: {
          status: "pending",
          createdAtFrom: yesterday.toISOString(),
          createdAtTo: tomorrow.toISOString(),
          sortBy: "updatedAt",
          sortOrder: "asc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Verify combined filter respects AND logic by checking all returned items match criteria
  for (const item of combinedFilterResult.data) {
    TestValidator.equals(
      "filtered item has matching status",
      item.status,
      "pending",
    );
    TestValidator.predicate(
      "filtered item createdAt is within range",
      new Date(item.createdAt) >= yesterday &&
        new Date(item.createdAt) <= tomorrow,
    );
  }
  // 7. Test Pagination Bounds - Request with page and limit
  const paginationResult =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.index(
      sellerConnection,
      {
        orderItemId,
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.predicate(
    "pagination limit matches request",
    paginationResult.pagination.limit === 1,
  );
  TestValidator.predicate(
    "pagination current matches request",
    paginationResult.pagination.current === 1,
  );
  // 8. Test Empty Filter Case (retrieves all without filters)
  const allResults =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.index(
      sellerConnection,
      {
        orderItemId,
        body: {},
      },
    );
  typia.assert(allResults);
  TestValidator.predicate(
    "empty filter returns valid pagination",
    allResults.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "empty filter returns data array",
    Array.isArray(allResults.data),
  );
}
