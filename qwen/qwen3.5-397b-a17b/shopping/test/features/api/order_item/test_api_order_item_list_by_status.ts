import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a customer can successfully retrieve order items from their own order with status-based filtering.
 *
 * This test validates the order items listing endpoint with various status filters.
 * It ensures that customers can view their order items, filter by fulfillment status,
 * and that the response includes proper pagination metadata and snapshot data.
 */
export async function test_api_order_item_list_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create seller account and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a product with variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Customer setup - create customer account and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    },
  });
  // 4. Create an order with multiple items
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // 5. Retrieve all order items without status filter
  const allItemsResponse =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerLoginConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 50,
        },
      },
    );
  typia.assert(allItemsResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "has pagination metadata",
    allItemsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    allItemsResponse.pagination.current === 1,
  );
  TestValidator.predicate("has limit", allItemsResponse.pagination.limit > 0);
  TestValidator.predicate(
    "has total records",
    allItemsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has total pages",
    allItemsResponse.pagination.pages >= 0,
  );
  // Validate order items array
  TestValidator.predicate("has order items", allItemsResponse.data.length > 0);
  // Validate each order item structure
  for (const item of allItemsResponse.data) {
    TestValidator.predicate("item has id", item.id !== undefined);
    TestValidator.predicate("item has quantity", item.quantity > 0);
    TestValidator.predicate("item has price", item.price > 0);
    TestValidator.predicate("item has status", item.status !== undefined);
    TestValidator.predicate("item has product", item.product !== undefined);
    TestValidator.predicate(
      "item has product variant",
      item.productVariant !== undefined,
    );
    TestValidator.predicate("item has seller", item.seller !== undefined);
    TestValidator.predicate(
      "item has created_at",
      item.created_at !== undefined,
    );
    // Validate snapshot data
    TestValidator.predicate(
      "variant has sku_code",
      item.productVariant.sku_code !== undefined,
    );
  }
  // 6. Filter order items by status='paid'
  const paidItemsResponse =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerLoginConnection,
      {
        orderId: order.id,
        body: {
          status: "paid",
          page: 1,
          limit: 50,
        },
      },
    );
  typia.assert(paidItemsResponse);
  // Validate all returned items have paid status
  for (const item of paidItemsResponse.data) {
    TestValidator.equals("paid item status", item.status, "paid");
  }
  // 7. Filter order items by status='delivered'
  const deliveredItemsResponse =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerLoginConnection,
      {
        orderId: order.id,
        body: {
          status: "delivered",
          page: 1,
          limit: 50,
        },
      },
    );
  typia.assert(deliveredItemsResponse);
  // Validate all returned items have delivered status
  for (const item of deliveredItemsResponse.data) {
    TestValidator.equals("delivered item status", item.status, "delivered");
  }
  // 8. Validate that filtered results are subsets of all items
  const allItemIds = allItemsResponse.data.map((item) => item.id);
  const paidItemIds = paidItemsResponse.data.map((item) => item.id);
  const deliveredItemIds = deliveredItemsResponse.data.map((item) => item.id);
  // All paid items should be in all items
  for (const paidId of paidItemIds) {
    TestValidator.predicate(
      "paid item exists in all items",
      allItemIds.includes(paidId),
    );
  }
  // All delivered items should be in all items
  for (const deliveredId of deliveredItemIds) {
    TestValidator.predicate(
      "delivered item exists in all items",
      allItemIds.includes(deliveredId),
    );
  }
  // 9. Validate seller information in snapshots
  for (const item of allItemsResponse.data) {
    TestValidator.predicate("seller has id", item.seller.id !== undefined);
    TestValidator.predicate(
      "seller has email",
      item.seller.email !== undefined,
    );
    TestValidator.predicate(
      "seller has approval_status",
      item.seller.approval_status !== undefined,
    );
  }
}
