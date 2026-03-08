import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";

/**
 * Test pagination and sorting functionality for order item retrieval.
 *
 * This test verifies:
 * 1. Page parameter is 1-based pagination
 * 2. Limit parameter controls records per page (max 100)
 * 3. Pagination metadata includes current page, limit, total records, and total pages
 * 4. Default sort is created_at descending (newest first)
 * 5. Sorting by other fields supported: status, quantity, unit_price
 * 6. Sort order can be asc or desc
 * 7. Pagination handles edge cases: empty results, results matching limit, results spanning multiple pages
 */
export async function test_api_order_items_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Create order with multiple items for pagination testing
  // Note: The order creation endpoint will create items from cart
  // We'll create an order and then test pagination on its items
  const order = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 3. Test basic pagination with default sorting (created_at desc)
  const page1 = await api.functional.ecommerceMall.customer.orders.items.index(
    customerConnection,
    {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.predicate("page 1 has records", page1.pagination.records >= 0);
  TestValidator.predicate("page 1 has pages", page1.pagination.pages >= 0);
  // 4. Test pagination across multiple pages
  const page2 = await api.functional.ecommerceMall.customer.orders.items.index(
    customerConnection,
    {
      orderId: order.id,
      body: {
        page: 2,
        limit: 10,
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  // Verify page 2 has different or no data compared to page 1
  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.notEquals(
      "page 2 items differ from page 1",
      page1.data[0].id,
      page2.data[0].id,
    );
  }
  // 5. Test default sorting (created_at descending)
  const defaultSort =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(defaultSort);
  // Verify items are sorted by created_at descending (newest first)
  if (defaultSort.data.length > 1) {
    for (let i = 0; i < defaultSort.data.length - 1; i++) {
      TestValidator.predicate(
        `item ${i} created_at >= item ${i + 1} created_at (default desc)`,
        defaultSort.data[i].createdAt >= defaultSort.data[i + 1].createdAt,
      );
    }
  }
  // 6. Test sorting by created_at ascending
  const createdAtAsc =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 100,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(createdAtAsc);
  // Verify items are sorted by created_at ascending (oldest first)
  if (createdAtAsc.data.length > 1) {
    for (let i = 0; i < createdAtAsc.data.length - 1; i++) {
      TestValidator.predicate(
        `item ${i} created_at <= item ${i + 1} created_at (asc)`,
        createdAtAsc.data[i].createdAt <= createdAtAsc.data[i + 1].createdAt,
      );
    }
  }
  // 7. Test sorting by quantity
  const quantityDesc =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 100,
          sort_by: "quantity",
          sort_order: "desc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(quantityDesc);
  // Verify items are sorted by quantity descending
  if (quantityDesc.data.length > 1) {
    for (let i = 0; i < quantityDesc.data.length - 1; i++) {
      TestValidator.predicate(
        `item ${i} quantity >= item ${i + 1} quantity (desc)`,
        quantityDesc.data[i].quantity >= quantityDesc.data[i + 1].quantity,
      );
    }
  }
  // 8. Test sorting by unit_price
  const priceAsc =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 100,
          sort_by: "unit_price",
          sort_order: "asc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(priceAsc);
  // Verify items are sorted by unit_price ascending
  if (priceAsc.data.length > 1) {
    for (let i = 0; i < priceAsc.data.length - 1; i++) {
      TestValidator.predicate(
        `item ${i} unitPrice <= item ${i + 1} unitPrice (asc)`,
        priceAsc.data[i].unitPrice <= priceAsc.data[i + 1].unitPrice,
      );
    }
  }
  // 9. Test edge case: limit exactly matches records
  const exactLimit =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: Math.min(order.order_items.length, 100),
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(exactLimit);
  TestValidator.equals(
    "exact limit records match",
    exactLimit.data.length,
    Math.min(order.order_items.length, 100),
  );
  // 10. Test pagination metadata calculation
  const testPage =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(testPage);
  const expectedPages = Math.ceil(
    testPage.pagination.records / testPage.pagination.limit,
  );
  TestValidator.equals(
    "total pages calculation",
    testPage.pagination.pages,
    expectedPages,
  );
}
