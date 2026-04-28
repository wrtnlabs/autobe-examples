import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test authenticated customer order search by partial order number match.
 *
 * Validates the order search endpoint with various search criteria including partial order number text search, status filtering, and date range queries. Verifies that the paginated response structure is correctly returned with pagination metadata and order summary data.
 *
 * Since order creation is not available via SDK functions, this test focuses on validating the search request parameter handling, response structure validation, and pagination behavior with an authenticated customer context.
 *
 * 1. Customer registers and authenticates via /auth/customer/join.
 * 2. Customer searches orders with partial order number substring.
 * 3. Customer searches orders with status filter.
 * 4. Customer searches orders with date range filter.
 * 5. Customer searches orders with combined filters (search + status + date range).
 * 6. Customer searches orders with pagination parameters (limit, page).
 * 7. Validates all responses have correct structure and pagination metadata.
 */
export async function test_api_orders_search_by_order_number(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authorized);
  // 2. Search with partial order number substring
  const searchKeyword = RandomGenerator.alphabets(6);
  const searchResponse =
    await api.functional.ecommercePlatform.customer.orders.index(
      customerConnection,
      {
        body: {
          search: searchKeyword,
        } satisfies IEcommercePlatformOrder.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search response has valid pagination current",
    searchResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "search response has data array",
    Array.isArray(searchResponse.data),
  );
  // 3. Search with status filter
  const statusResponse =
    await api.functional.ecommercePlatform.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "paid",
        } satisfies IEcommercePlatformOrder.IRequest,
      },
    );
  typia.assert(statusResponse);
  TestValidator.predicate(
    "status filter response has valid pagination",
    statusResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "status filter response data is array",
    Array.isArray(statusResponse.data),
  );
  // 4. Search with date range filter
  const now = new Date();
  const futureDate = new Date(now.getTime() + 86400000 * 30);
  const dateRangeResponse =
    await api.functional.ecommercePlatform.customer.orders.index(
      customerConnection,
      {
        body: {
          created_at_from: now.toISOString(),
          created_at_to: futureDate.toISOString(),
        } satisfies IEcommercePlatformOrder.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  TestValidator.predicate(
    "date range response has valid pagination",
    dateRangeResponse.pagination.current >= 1,
  );
  // 5. Search with combined filters (search + status + date range)
  const combinedResponse =
    await api.functional.ecommercePlatform.customer.orders.index(
      customerConnection,
      {
        body: {
          search: RandomGenerator.alphabets(4),
          status: "shipped",
          created_at_from: new Date(now.getTime() - 86400000 * 7).toISOString(),
          created_at_to: futureDate.toISOString(),
        } satisfies IEcommercePlatformOrder.IRequest,
      },
    );
  typia.assert(combinedResponse);
  TestValidator.predicate(
    "combined filter response has valid pagination",
    combinedResponse.pagination.current >= 1,
  );
  // 6. Search with pagination parameters (limit, page)
  const paginationResponse =
    await api.functional.ecommercePlatform.customer.orders.index(
      customerConnection,
      {
        body: {
          limit: 5 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          page: 1,
        } satisfies IEcommercePlatformOrder.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination limit matches request",
    paginationResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    paginationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    paginationResponse.pagination.pages >= 0,
  );
}
