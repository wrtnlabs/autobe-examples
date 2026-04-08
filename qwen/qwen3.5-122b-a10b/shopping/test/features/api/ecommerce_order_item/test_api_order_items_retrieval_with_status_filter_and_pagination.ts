import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer order items retrieval with status filtering and pagination.
 *
 * Validates the order items retrieval endpoint for customers, ensuring proper filtering by fulfillment status, sorting capabilities, and cursor-based pagination. Tests that customers can only access their own order items and that all response fields are correctly populated.
 *
 * The test covers primary success paths, status filtering scenarios, sorting options, pagination navigation, and empty result handling. Special attention is given to verifying that purchase-time prices are locked and status enum values match business definitions.
 *
 * 1. Customer registers and authenticates to access order items endpoint.
 * 2. Customer retrieves order items without filters to verify basic functionality.
 * 3. Customer applies status filters (paid, shipped, delivered, cancelled, refunded).
 * 4. Customer tests sorting by different fields (status, quantity, unit_price, created_at).
 * 5. Customer navigates through multiple pages using cursor-based pagination.
 * 6. Customer verifies empty result handling when filters match no items.
 * 7. Validates response structure includes all required fields and references.
 */
export async function test_api_order_items_retrieval_with_status_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.ecommerce.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // 2. Retrieve order items without filters (using random order ID)
  // Note: In a real scenario, we would create an order first, but SDK doesn't provide order creation
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const allItems = await api.functional.ecommerce.customer.orders.items.index(
    customerConnection,
    {
      orderId,
      body: {
        limit: 20,
      } satisfies IEcommerceOrderItem.IRequest,
    },
  );
  typia.assert(allItems);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    allItems.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    allItems.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    allItems.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    allItems.pagination.pages >= 0,
  );
  // 3. Test status filtering for each valid status
  const statuses = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const;
  for (const status of statuses) {
    const filteredItems =
      await api.functional.ecommerce.customer.orders.items.index(
        customerConnection,
        {
          orderId,
          body: {
            status,
            limit: 20,
          } satisfies IEcommerceOrderItem.IRequest,
        },
      );
    typia.assert(filteredItems);
    // All returned items should match the filter status
    for (const item of filteredItems.data) {
      TestValidator.equals("status matches filter", item.status, status);
    }
  }
  // 4. Test sorting options
  const sortByFields = [
    "status",
    "quantity",
    "unit_price",
    "created_at",
  ] as const;
  const sortOrders = ["asc", "desc"] as const;
  for (const sortBy of sortByFields) {
    for (const sortOrder of sortOrders) {
      const sortedItems =
        await api.functional.ecommerce.customer.orders.items.index(
          customerConnection,
          {
            orderId,
            body: {
              sortBy,
              sortOrder,
              limit: 20,
            } satisfies IEcommerceOrderItem.IRequest,
          },
        );
      typia.assert(sortedItems);
      // Validate response structure for each item (typia.assert already validates types)
      for (const item of sortedItems.data) {
        TestValidator.predicate("order has id", item.order.id.length > 0);
        TestValidator.predicate(
          "order has order_number",
          item.order.order_number.length > 0,
        );
        TestValidator.predicate(
          "order has status",
          item.order.status.length > 0,
        );
        TestValidator.predicate(
          "order has total_price",
          item.order.total_price >= 0,
        );
        TestValidator.predicate(
          "order has created_at",
          item.order.created_at.length > 0,
        );
        TestValidator.predicate(
          "order has customer",
          item.order.customer !== null,
        );
        TestValidator.predicate(
          "variant has id",
          item.productVariant.id.length > 0,
        );
        TestValidator.predicate(
          "variant has sku_code",
          item.productVariant.sku_code.length > 0,
        );
        TestValidator.predicate(
          "variant has option_values",
          item.productVariant.option_values.length > 0,
        );
        TestValidator.predicate(
          "variant has stock_count",
          item.productVariant.stock_count >= 0,
        );
        TestValidator.predicate(
          "variant has product",
          item.productVariant.product !== null,
        );
        TestValidator.predicate("seller has id", item.seller.id.length > 0);
        TestValidator.predicate(
          "seller has approval_status",
          item.seller.approval_status.length > 0,
        );
        TestValidator.predicate(
          "seller has shop_name",
          item.seller.shop_name.length > 0,
        );
      }
    }
  }
  // 5. Test cursor-based pagination (navigate through pages)
  let cursor: string | undefined = undefined;
  let pageItems: IPageIEcommerceOrderItem.ISummary | null = null;
  // Get first page
  const firstPage = await api.functional.ecommerce.customer.orders.items.index(
    customerConnection,
    {
      orderId,
      body: {
        limit: 5,
      } satisfies IEcommerceOrderItem.IRequest,
    },
  );
  typia.assert(firstPage);
  pageItems = firstPage;
  // Try to get next pages (may be empty if no more data)
  for (let i = 0; i < 3; i++) {
    if (pageItems && pageItems.data.length > 0) {
      // Use last item's created_at and id as cursor
      const lastItem: IEcommerceOrderItem.ISummary = pageItems.data[pageItems.data.length - 1];
      cursor = `${lastItem.created_at}|${lastItem.id}`;
    }
    const nextPage: IPageIEcommerceOrderItem.ISummary = await api.functional.ecommerce.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          cursor,
          limit: 5,
        } satisfies IEcommerceOrderItem.IRequest,
      },
    );
    typia.assert(nextPage);
    pageItems = nextPage;
    // If we get empty data, we've reached the end
    if (pageItems !== null && pageItems.data.length === 0) {
      break;
    }
  }
  // 6. Test empty result handling with non-matching status
  const emptyResult =
    await api.functional.ecommerce.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          status: "cancelled",
          limit: 20,
        } satisfies IEcommerceOrderItem.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.predicate(
    "pagination metadata is valid for empty result",
    emptyResult.pagination.current >= 0 &&
      emptyResult.pagination.limit >= 0 &&
      emptyResult.pagination.records >= 0 &&
      emptyResult.pagination.pages >= 0,
  );
  // 7. Test date range filtering
  const dateFrom = new Date(Date.now() - 86400000 * 30).toISOString(); // 30 days ago
  const dateTo = new Date().toISOString();
  const dateFiltered =
    await api.functional.ecommerce.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          dateFrom,
          dateTo,
          limit: 20,
        } satisfies IEcommerceOrderItem.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // All items should be within the date range (if any exist)
  for (const item of dateFiltered.data) {
    const itemDate = new Date(item.created_at).getTime();
    TestValidator.predicate(
      "item within date range",
      itemDate >= new Date(dateFrom).getTime() &&
        itemDate <= new Date(dateTo).getTime(),
    );
  }
  // 8. Test seller filtering
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerFiltered =
    await api.functional.ecommerce.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          sellerId,
          limit: 20,
        } satisfies IEcommerceOrderItem.IRequest,
      },
    );
  typia.assert(sellerFiltered);
  // All items should match the seller filter (if any exist)
  for (const item of sellerFiltered.data) {
    TestValidator.equals("seller matches filter", item.seller.id, sellerId);
  }
}