import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string>(),
      password: "12345678",
      href: "https://example.com/registration",
      referrer: "https://example.com/home",
    } satisfies DeepPartial<IShoppingMallCustomer.IJoin>,
  });
  typia.assert(customer);
  // Test 1: Basic retrieval with default parameters (empty order history)
  const defaultResponse =
    await api.functional.shoppingMall.customer.orders.history.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies DeepPartial<IShoppingMallOrder.IRequest>,
      },
    );
  typia.assert(defaultResponse);
  // Validate pagination structure exists
  TestValidator.equals(
    "pagination structure",
    typeof defaultResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination has current",
    typeof defaultResponse.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof defaultResponse.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records",
    typeof defaultResponse.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages",
    typeof defaultResponse.pagination.pages,
    "number",
  );
  // Test 2: Pagination validation with specific limit
  const testLimit = 5;
  const paginatedResponse =
    await api.functional.shoppingMall.customer.orders.history.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: testLimit,
        } satisfies DeepPartial<IShoppingMallOrder.IRequest>,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResponse.pagination.limit,
    testLimit,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResponse.pagination.current,
    2,
  );
  // Test 3: Status filtering
  const statusFilter = "paid";
  const statusResponse =
    await api.functional.shoppingMall.customer.orders.history.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          status: statusFilter,
        } satisfies DeepPartial<IShoppingMallOrder.IRequest>,
      },
    );
  typia.assert(statusResponse);
  typia.assert(statusResponse);
  // Test 4: Date range filtering
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.shoppingMall.customer.orders.history.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          startDate: twoDaysAgo.toISOString(),
          endDate: yesterday.toISOString(),
        } satisfies DeepPartial<IShoppingMallOrder.IRequest>,
      },
    );
  typia.assert(dateRangeResponse);
  typia.assert(dateRangeResponse);
  // Test 5: Ascending sort order
  const ascendingResponse =
    await api.functional.shoppingMall.customer.orders.history.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sortDirection: "asc",
        } satisfies DeepPartial<IShoppingMallOrder.IRequest>,
      },
    );
  typia.assert(ascendingResponse);
  typia.assert(ascendingResponse);
  // Test 6: Maximum page size validation
  const maxLimitResponse =
    await api.functional.shoppingMall.customer.orders.history.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100, // Maximum allowed
        } satisfies DeepPartial<IShoppingMallOrder.IRequest>,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit in pagination",
    maxLimitResponse.pagination.limit,
    100,
  );
  // Test 7: Verify response structure matches expected schema
  typia.assert(defaultResponse);
}
