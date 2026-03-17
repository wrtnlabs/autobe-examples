import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_list_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create multiple cancellation requests
  const cancellationRequests: IShoppingMallCancellationRequest[] = [];
  for (let i = 0; i < 5; i++) {
    const request =
      await generate_random_shopping_mall_customer_cancellation_requests_create(
        customerConnection,
        {
          body: {
            reason: `Cancellation reason ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          },
        },
      );
    typia.assert(request);
    cancellationRequests.push(request);
  }
  // 3. Test with both requestedAtFrom and requestedAtTo
  const firstRequest = cancellationRequests[0];
  const lastRequest = cancellationRequests[cancellationRequests.length - 1];
  // Get all requests without date filter to verify count
  const allRequests =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  TestValidator.predicate(
    "has cancellation requests",
    allRequests.data.length >= 5,
  );
  // Test date range filter - from first request time to last request time
  const dateRangeResult =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          requestedAtFrom: firstRequest.requested_at,
          requestedAtTo: lastRequest.requested_at,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range returns requests",
    dateRangeResult.data.length > 0,
  );
  // Verify all returned requests are within the date range
  for (const req of dateRangeResult.data) {
    TestValidator.predicate(
      "request within from date",
      new Date(req.requested_at).getTime() >=
        new Date(firstRequest.requested_at).getTime(),
    );
    TestValidator.predicate(
      "request within to date",
      new Date(req.requested_at).getTime() <=
        new Date(lastRequest.requested_at).getTime(),
    );
  }
  // 4. Test with only requestedAtFrom (all requests from that date onward)
  const fromDateOnly =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          requestedAtFrom: firstRequest.requested_at,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(fromDateOnly);
  TestValidator.predicate(
    "from date filter returns requests",
    fromDateOnly.data.length > 0,
  );
  // Verify all requests are on or after the from date
  for (const req of fromDateOnly.data) {
    TestValidator.predicate(
      "request after from date",
      new Date(req.requested_at).getTime() >=
        new Date(firstRequest.requested_at).getTime(),
    );
  }
  // 5. Test with only requestedAtTo (all requests up to that date)
  const toDateOnly =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          requestedAtTo: lastRequest.requested_at,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(toDateOnly);
  TestValidator.predicate(
    "to date filter returns requests",
    toDateOnly.data.length > 0,
  );
  // Verify all requests are on or before the to date
  for (const req of toDateOnly.data) {
    TestValidator.predicate(
      "request before to date",
      new Date(req.requested_at).getTime() <=
        new Date(lastRequest.requested_at).getTime(),
    );
  }
  // 6. Test pagination with date filters
  const paginatedResult =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          requestedAtFrom: firstRequest.requested_at,
          requestedAtTo: lastRequest.requested_at,
          page: 1,
          limit: 2,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedResult.pagination.limit, 2);
  TestValidator.predicate(
    "pagination pages calculated",
    paginatedResult.pagination.pages >= 1,
  );
  // 7. Test combining date filter with status filter
  const combinedFilter =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          requestedAtFrom: firstRequest.requested_at,
          requestedAtTo: lastRequest.requested_at,
          status: "PENDING",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Verify all returned requests match both filters
  for (const req of combinedFilter.data) {
    TestValidator.equals("status matches filter", req.status, "PENDING");
    TestValidator.predicate(
      "request within date range",
      new Date(req.requested_at).getTime() >=
        new Date(firstRequest.requested_at).getTime() &&
        new Date(req.requested_at).getTime() <=
          new Date(lastRequest.requested_at).getTime(),
    );
  }
  // 8. Test boundary timestamps (inclusive range)
  // Request exactly at requestedAtFrom should be included
  const exactFromBoundary =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          requestedAtFrom: firstRequest.requested_at,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(exactFromBoundary);
  // Check if first request is included (boundary test)
  const firstRequestIncluded = exactFromBoundary.data.some(
    (req) => req.id === firstRequest.id,
  );
  TestValidator.predicate("boundary request included", firstRequestIncluded);
  // 9. Test future date (should return empty or fewer results)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);
  const futureResult =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          requestedAtFrom: futureDate.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(futureResult);
  TestValidator.predicate(
    "future date returns no or few results",
    futureResult.data.length < 5,
  );
}
