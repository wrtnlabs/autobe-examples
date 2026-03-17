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

export async function test_api_cancellation_request_list_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test default request (no filters) - should return empty results
  const defaultResponse =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default - records count",
    defaultResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "default - pages count",
    defaultResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "default - data array length",
    defaultResponse.data.length,
    0,
  );
  // 3. Test with status filter - PENDING
  const pendingResponse =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "PENDING",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResponse);
  TestValidator.equals(
    "pending status - records",
    pendingResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pending status - pages",
    pendingResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pending status - data length",
    pendingResponse.data.length,
    0,
  );
  // 4. Test with status filter - APPROVED
  const approvedResponse =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "APPROVED",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResponse);
  TestValidator.equals(
    "approved status - records",
    approvedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "approved status - pages",
    approvedResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "approved status - data length",
    approvedResponse.data.length,
    0,
  );
  // 5. Test with status filter - REJECTED
  const rejectedResponse =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "REJECTED",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  TestValidator.equals(
    "rejected status - records",
    rejectedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "rejected status - pages",
    rejectedResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "rejected status - data length",
    rejectedResponse.data.length,
    0,
  );
  // 6. Test with date range filter
  const now = new Date();
  const dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  const dateTo = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
  const dateRangeResponse =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          requestedAtFrom: dateFrom.toISOString(),
          requestedAtTo: dateTo.toISOString(),
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  TestValidator.equals(
    "date range - records",
    dateRangeResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "date range - pages",
    dateRangeResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "date range - data length",
    dateRangeResponse.data.length,
    0,
  );
  // 7. Test with orderItemId filter (random UUID that doesn't exist)
  const orderItemIdResponse =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(orderItemIdResponse);
  TestValidator.equals(
    "orderItemId filter - records",
    orderItemIdResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "orderItemId filter - pages",
    orderItemIdResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "orderItemId filter - data length",
    orderItemIdResponse.data.length,
    0,
  );
  // 8. Test with combined filters (status + date range)
  const combinedResponse =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "PENDING",
          requestedAtFrom: dateFrom.toISOString(),
          requestedAtTo: dateTo.toISOString(),
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(combinedResponse);
  TestValidator.equals(
    "combined filters - records",
    combinedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filters - pages",
    combinedResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "combined filters - data length",
    combinedResponse.data.length,
    0,
  );
  // 9. Test with pagination parameters
  const paginatedResponse =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination - records",
    paginatedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination - pages",
    paginatedResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination - data length",
    paginatedResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination - current page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination - limit",
    paginatedResponse.pagination.limit,
    20,
  );
}
