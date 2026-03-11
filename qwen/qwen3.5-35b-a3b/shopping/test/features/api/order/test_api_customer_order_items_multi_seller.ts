import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_items_multi_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - Join and login to create authenticated session
  const customerConnection: api.IConnection = { host: connection.host };
  const testPassword = RandomGenerator.alphaNumeric(16) satisfies string &
    tags.Format<"password"> &
    tags.MinLength<8>;
  const customerEmail = typia.random<
    string & tags.Format<"email">
  >() satisfies string & tags.Format<"email"> as string &
    tags.Format<"email"> &
    tags.MinLength<1> &
    tags.MaxLength<255>;
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>() satisfies string &
        tags.Format<"uri"> as string & tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string &
        tags.Format<"uri"> as string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string &
        tags.Format<"ipv4"> as string & tags.Format<"ipv4">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Login to establish fresh session with updated connection
  const loginConnection: api.IConnection = { host: connection.host };
  const customerLoginAuth = await authorize_customer_login(loginConnection, {
    body: {
      email: customerAuth.email,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>() satisfies string &
        tags.Format<"uri"> as string & tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string &
        tags.Format<"uri"> as string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string &
        tags.Format<"ipv4"> as string & tags.Format<"ipv4">,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(customerLoginAuth);
  // 3. Test order items endpoint with valid authentication
  const testOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">;
  // Test 1: Query all order items without filters
  const allItemsResponse =
    await api.functional.ecommerceMall.customer.orders.items.index(
      loginConnection,
      {
        orderId: testOrderId,
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(allItemsResponse);
  // Validate pagination structure exists
  typia.assert(allItemsResponse.pagination);
  typia.assert(allItemsResponse.data);
  // Test 2: Query with pagination parameters
  const paginatedResponse =
    await api.functional.ecommerceMall.customer.orders.items.index(
      loginConnection,
      {
        orderId: testOrderId,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Test 3: Query with sorting parameters
  const sortedResponse =
    await api.functional.ecommerceMall.customer.orders.items.index(
      loginConnection,
      {
        orderId: testOrderId,
        body: {
          sortBy: "created_at" satisfies
            | "created_at"
            | "updated_at"
            | "quantity",
          sortOrder: "desc" satisfies "asc" | "desc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedResponse);
  // Test 4: Query with status filter
  const statusFilteredResponse =
    await api.functional.ecommerceMall.customer.orders.items.index(
      loginConnection,
      {
        orderId: testOrderId,
        body: {
          status: "paid" satisfies
            | "paid"
            | "shipped"
            | "delivered"
            | "cancelled"
            | "refunded",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(statusFilteredResponse);
  // Test 5: Query with text search
  const searchResponse =
    await api.functional.ecommerceMall.customer.orders.items.index(
      loginConnection,
      {
        orderId: testOrderId,
        body: {
          search: typia.random<string & tags.MaxLength<200>>(),
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(searchResponse);
  // 4. Validate that if items exist, each item has the required snapshot fields
  if (paginatedResponse.data.length > 0) {
    for (const item of paginatedResponse.data) {
      typia.assert(item);
      // Validate quantity is integer
      TestValidator.predicate(
        "quantity is integer",
        Number.isInteger(item.quantity),
      );
      // Validate unit_price is number
      TestValidator.predicate(
        "unit_price is number",
        typeof item.unit_price === "number",
      );
      // Validate item_status is string
      TestValidator.predicate(
        "item_status is string",
        typeof item.item_status === "string",
      );
      // Validate timestamps are valid date-time strings
      TestValidator.predicate(
        "created_at is valid date-time",
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(item.created_at),
      );
      TestValidator.predicate(
        "updated_at is valid date-time",
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(item.updated_at),
      );
    }
  }
  // 5. Test edge case: Empty order (no items)
  const emptyOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">;
  const emptyItemsResponse =
    await api.functional.ecommerceMall.customer.orders.items.index(
      loginConnection,
      {
        orderId: emptyOrderId,
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(emptyItemsResponse);
  // Validate empty order response structure
  TestValidator.equals(
    "empty order has empty data array",
    emptyItemsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty order pagination records",
    emptyItemsResponse.pagination.records,
    0,
  );
  // Test 6: Test with different page sizes
  const smallPageSizeResponse =
    await api.functional.ecommerceMall.customer.orders.items.index(
      loginConnection,
      {
        orderId: testOrderId,
        body: {
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(smallPageSizeResponse);
  const maxPageSizeResponse =
    await api.functional.ecommerceMall.customer.orders.items.index(
      loginConnection,
      {
        orderId: testOrderId,
        body: {
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(maxPageSizeResponse);
}
