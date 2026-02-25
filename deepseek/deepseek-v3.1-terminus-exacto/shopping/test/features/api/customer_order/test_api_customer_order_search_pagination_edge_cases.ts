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

export async function test_api_customer_order_search_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Test 1: Empty result set with pagination
  const emptySearch = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        customer_id: typia.random<string & tags.Format<"uuid">>(), // Non-existent customer
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty result should have zero records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result should have zero pages",
    emptySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result should have empty data array",
    emptySearch.data.length,
    0,
  );
  TestValidator.predicate(
    "empty result current page should be 1",
    emptySearch.pagination.current === 1,
  );
  TestValidator.equals(
    "empty result limit should match request",
    emptySearch.pagination.limit,
    10,
  );
  // Test 2: Invalid limit parameter validation
  await TestValidator.error("should reject limit below minimum", async () => {
    await api.functional.ecommerce.customer.orders.index(customerConnection, {
      body: { limit: 0 } satisfies IEcommerceOrder.IRequest,
    });
  });
  await TestValidator.error("should reject limit above maximum", async () => {
    await api.functional.ecommerce.customer.orders.index(customerConnection, {
      body: { limit: 101 } satisfies IEcommerceOrder.IRequest,
    });
  });
  // Test 3: Valid limit boundaries
  const minLimitResult = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: { limit: 1 } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(minLimitResult);
  TestValidator.predicate(
    "minimum limit should be accepted",
    minLimitResult.pagination.limit === 1,
  );
  const maxLimitResult = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: { limit: 100 } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "maximum limit should be accepted",
    maxLimitResult.pagination.limit === 100,
  );
  // Test 4: Page navigation beyond available data
  const largePageSearch = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 9999,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(largePageSearch);
  TestValidator.predicate(
    "page beyond data should return empty array",
    largePageSearch.data.length === 0,
  );
  TestValidator.predicate(
    "current page should match requested page",
    largePageSearch.pagination.current === 9999,
  );
  TestValidator.predicate(
    "records should not be negative",
    largePageSearch.pagination.records >= 0,
  );
  // Test 5: Pagination metadata consistency
  const page1Result = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: { page: 1, limit: 5 } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(page1Result);
  const page2Result = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: { page: 2, limit: 5 } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "records count should be consistent across pages",
    page1Result.pagination.records,
    page2Result.pagination.records,
  );
  TestValidator.equals(
    "limit should be consistent across pages",
    page1Result.pagination.limit,
    page2Result.pagination.limit,
  );
  TestValidator.equals(
    "total pages should be consistent across pages",
    page1Result.pagination.pages,
    page2Result.pagination.pages,
  );
  // Test 6: Date range filtering with pagination
  const futureDateSearch = await api.functional.ecommerce.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        created_after: new Date(Date.now() + 86400000).toISOString(), // Future date
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(futureDateSearch);
  TestValidator.equals(
    "future date search should have zero records",
    futureDateSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date search should have empty data",
    futureDateSearch.data.length,
    0,
  );
}
