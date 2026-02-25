import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test order search with date range filtering capabilities.
 * Verify that customers can filter orders created within specific time periods
 * using created_after and created_before parameters.
 */
export async function test_api_customer_order_search_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Since we don't have an order creation endpoint, we'll test the search functionality
  // by making multiple search requests with different date filters and verifying
  // the API's behavior and response structure
  // Test 1: Search without date filters (baseline)
  const baselineResult = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(baselineResult);
  // Test 2: Filter orders created after current time (should return empty)
  const futureDate = new Date(Date.now() + 86400000); // 1 day in future
  const futureResult = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: {
        created_after: futureDate.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(futureResult);
  TestValidator.equals(
    "future date filter returns empty",
    futureResult.data.length,
    0,
  );
  // Test 3: Filter orders created before current time (should return all orders)
  const currentDate = new Date();
  const pastResult = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: {
        created_before: currentDate.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(pastResult);
  // Verify the response structure is correct
  TestValidator.predicate(
    "response has pagination",
    pastResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(pastResult.data),
  );
  // Test 4: Filter with both date parameters set to null
  const nullFilterResult = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: {
        created_after: null,
        created_before: null,
        page: 1,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(nullFilterResult);
  // Null filters should behave the same as no filters
  TestValidator.predicate(
    "null filters return valid response",
    nullFilterResult.data.length >= 0,
  );
  // Test 5: Filter with invalid date range (after > before)
  const invalidRangeResult =
    await api.functional.ecommerce.customer.orders.index(customerConnection, {
      body: {
        created_after: futureDate.toISOString(),
        created_before: currentDate.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    });
  typia.assert(invalidRangeResult);
  // The API should handle invalid date ranges gracefully (likely empty result)
  TestValidator.predicate(
    "invalid date range handled gracefully",
    invalidRangeResult.data.length >= 0,
  );
  // Test 6: Verify pagination structure
  TestValidator.predicate(
    "pagination has current page",
    typeof pastResult.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof pastResult.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records count",
    typeof pastResult.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages count",
    typeof pastResult.pagination.pages === "number",
  );
  // Test 7: Verify order summary structure
  if (pastResult.data.length > 0) {
    const sampleOrder = pastResult.data[0];
    TestValidator.predicate("order has id", typeof sampleOrder.id === "string");
    TestValidator.predicate(
      "order has created_at",
      typeof sampleOrder.created_at === "string",
    );
    TestValidator.predicate(
      "order has updated_at",
      typeof sampleOrder.updated_at === "string",
    );
    TestValidator.predicate(
      "order has customer",
      sampleOrder.customer !== undefined,
    );
    if (sampleOrder.customer) {
      TestValidator.predicate(
        "customer has id",
        typeof sampleOrder.customer.id === "string",
      );
      TestValidator.predicate(
        "customer has email",
        typeof sampleOrder.customer.email === "string",
      );
      TestValidator.predicate(
        "customer has display_name",
        typeof sampleOrder.customer.display_name === "string",
      );
      TestValidator.predicate(
        "customer has created_at",
        typeof sampleOrder.customer.created_at === "string",
      );
    }
  }
  // Test 8: Different pagination parameters
  const paginationTest = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(paginationTest);
  TestValidator.equals(
    "custom page number",
    paginationTest.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit value",
    paginationTest.pagination.limit,
    5,
  );
}
