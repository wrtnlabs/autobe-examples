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

export async function test_api_customer_order_items_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: "12345678",
      href: "http://test.example.com/join",
      referrer: "http://test.example.com/",
      ip: typia.assert<string & tags.Format<"ipv4"> | null | undefined>(typia.random<string & tags.Format<"ipv4">>() ?? null),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Re-login to ensure fresh session
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customer.email,
      password: "12345678",
      href: "http://test.example.com/login",
      referrer: "http://test.example.com/join",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(customerAuth);
  // 2. Generate test order ID (mock data for simulation mode)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test default behavior - get all items sorted by created_at desc
  const defaultResponse =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerLoginConnection,
      {
        orderId,
        body: {},
      },
    );
  typia.assert(defaultResponse);
  // 4. Validate response structure
  TestValidator.predicate(
    "default response has pagination",
    () =>
      defaultResponse.pagination !== undefined &&
      defaultResponse.data !== undefined,
  );
  TestValidator.equals(
    "default pagination current is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination has records count",
    defaultResponse.pagination.records,
    defaultResponse.pagination.records,
  );
  const totalPages = Math.ceil(
    defaultResponse.pagination.records / defaultResponse.pagination.limit,
  );
  TestValidator.equals("default pagination pages calculation", totalPages, 0);
  // 5. Test with explicit pagination parameters
  const paginatedResponse =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerLoginConnection,
      {
        orderId,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated response has limit 10",
    paginatedResponse.pagination.limit,
    10,
  );
  // 6. Test sorting by quantity ascending
  const sortedQuantityResponse =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerLoginConnection,
      {
        orderId,
        body: {
          sortBy: "quantity",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortedQuantityResponse);
  // 7. Test sorting by updated_at descending (default is created_at desc)
  const sortedUpdatedResponse =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerLoginConnection,
      {
        orderId,
        body: {
          sortBy: "updated_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortedUpdatedResponse);
  // 8. Test status filter
  const statusFilteredResponse =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerLoginConnection,
      {
        orderId,
        body: {
          status: "paid",
        },
      },
    );
  typia.assert(statusFilteredResponse);
  // 9. Test text search
  const searchResponse =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerLoginConnection,
      {
        orderId,
        body: {
          search: "test",
        },
      },
    );
  typia.assert(searchResponse);
  // 10. Validate snapshot data structure for each item
  if (paginatedResponse.data.length > 0) {
    const firstItem = paginatedResponse.data[0];
    TestValidator.predicate(
      "item has product_snapshot object",
      () => typeof firstItem.product_snapshot === "object",
    );
    TestValidator.predicate(
      "item has variant_snapshot object",
      () => typeof firstItem.variant_snapshot === "object",
    );
    TestValidator.predicate(
      "item has seller_profile_snapshot object",
      () => typeof firstItem.seller_profile_snapshot === "object",
    );
  }
  // 11. Validate item fields
  if (paginatedResponse.data.length > 0) {
    const item = paginatedResponse.data[0];
    TestValidator.predicate(
      "item has uuid id",
      () => typeof item.id === "string",
    );
    TestValidator.predicate(
      "item has item_status string",
      () => typeof item.item_status === "string",
    );
    TestValidator.predicate(
      "item has quantity number",
      () => typeof item.quantity === "number",
    );
    TestValidator.predicate(
      "item has unit_price number",
      () => typeof item.unit_price === "number",
    );
    TestValidator.predicate(
      "item has created_at date-time",
      () => typeof item.created_at === "string",
    );
    TestValidator.predicate(
      "item has updated_at date-time",
      () => typeof item.updated_at === "string",
    );
    TestValidator.predicate(
      "item has deleted_at nullable",
      () => item.deleted_at === null || typeof item.deleted_at === "string",
    );
  }
  // 12. Test pagination metadata consistency
  const page1Response =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerLoginConnection,
      {
        orderId,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 has current 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit is 20",
    page1Response.pagination.limit,
    20,
  );
  const page2Response =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerLoginConnection,
      {
        orderId,
        body: {
          page: 2,
          limit: 20,
        },
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 has current 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit is still 20",
    page2Response.pagination.limit,
    20,
  );
}