import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test customer order filtering and search functionality.
 *
 * This test validates the order history endpoint's filtering and search capabilities:
 * 1. Creates a customer and seller account
 * 2. Creates products and variants for ordering
 * 3. Creates multiple orders with different characteristics
 * 4. Updates order item statuses to create variety
 * 5. Tests various filter combinations and sorting options
 */
export async function test_api_customer_order_filtering_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Setup: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Setup: Create customer address for orders
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: typia.random<string>(),
        country: "South Korea",
        isDefault: true,
      },
    },
  );
  typia.assert(address);
  // 4. Setup: Create product for orders
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Setup: Create product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: null,
          option_value_ids: [],
        },
      },
    );
  typia.assert(variant);
  // 6. Setup: Add variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 7. Create first order (ORD-TEST-001)
  const order1 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      },
    },
  );
  typia.assert(order1);
  // 8. Add another item to cart for second order
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItem2);
  // 9. Create second order (ORD-TEST-002)
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      },
    },
  );
  typia.assert(order2);
  // 10. Update order item statuses to create variety
  // Update first order's item to 'shipped'
  if (order1.orderItems.length > 0) {
    const updatedItem1 =
      await api.functional.shoppingMall.seller.orders.items.update(
        sellerConnection,
        {
          itemId: order1.orderItems[0].id,
          body: { status: "shipped" },
        },
      );
    typia.assert(updatedItem1);
  }
  // Update second order's item to 'delivered'
  if (order2.orderItems.length > 0) {
    const updatedItem2 =
      await api.functional.shoppingMall.seller.orders.items.update(
        sellerConnection,
        {
          itemId: order2.orderItems[0].id,
          body: { status: "delivered" },
        },
      );
    typia.assert(updatedItem2);
  }
  // 11. Test 1: Search by order_number partial match
  const searchResult = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        search: order1.order_number.substring(0, 8),
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate("search returns matching orders", () =>
    searchResult.data.every((order) =>
      order.order_number.includes(order1.order_number.substring(0, 8)),
    ),
  );
  // 12. Test 2: Filter by single status
  const shippedResult = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "shipped",
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(shippedResult);
  TestValidator.predicate("shipped filter returns only shipped orders", () =>
    shippedResult.data.every((order) => order.status === "shipped"),
  );
  // 13. Test 3: Filter by multiple statuses
  const multiStatusResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: ["paid", "shipped"],
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(multiStatusResult);
  TestValidator.predicate("multi-status filter returns correct orders", () =>
    multiStatusResult.data.every(
      (order) => order.status === "paid" || order.status === "shipped",
    ),
  );
  // 14. Test 4: Filter by date range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          ordered_at_from: yesterday.toISOString(),
          ordered_at_to: tomorrow.toISOString(),
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate("date range filter returns orders in range", () =>
    dateRangeResult.data.every((order) => {
      const orderDate = new Date(order.ordered_at);
      return orderDate >= yesterday && orderDate <= tomorrow;
    }),
  );
  // 15. Test 5: Combined filters (status + date range + search)
  const combinedResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "shipped",
          ordered_at_from: yesterday.toISOString(),
          ordered_at_to: tomorrow.toISOString(),
          search: order1.order_number.substring(0, 8),
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate("combined filters apply correctly", () =>
    combinedResult.data.every((order) => {
      const orderDate = new Date(order.ordered_at);
      return (
        order.status === "shipped" &&
        orderDate >= yesterday &&
        orderDate <= tomorrow &&
        order.order_number.includes(order1.order_number.substring(0, 8))
      );
    }),
  );
  // 16. Test 6: Sort by ordered_at ascending
  const sortAscResult = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        sort: "ordered_at",
        direction: "asc",
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(sortAscResult);
  TestValidator.predicate("ordered_at asc sorting is correct", () => {
    for (let i = 1; i < sortAscResult.data.length; i++) {
      if (
        new Date(sortAscResult.data[i].ordered_at) <
        new Date(sortAscResult.data[i - 1].ordered_at)
      ) {
        return false;
      }
    }
    return true;
  });
  // 17. Test 7: Sort by ordered_at descending
  const sortDescResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          sort: "ordered_at",
          direction: "desc",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(sortDescResult);
  TestValidator.predicate("ordered_at desc sorting is correct", () => {
    for (let i = 1; i < sortDescResult.data.length; i++) {
      if (
        new Date(sortDescResult.data[i].ordered_at) >
        new Date(sortDescResult.data[i - 1].ordered_at)
      ) {
        return false;
      }
    }
    return true;
  });
  // 18. Test 8: Sort by order_number
  const sortOrderResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          sort: "order_number",
          direction: "asc",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(sortOrderResult);
  TestValidator.predicate("order_number sorting is correct", () => {
    for (let i = 1; i < sortOrderResult.data.length; i++) {
      if (
        sortOrderResult.data[i].order_number <
        sortOrderResult.data[i - 1].order_number
      ) {
        return false;
      }
    }
    return true;
  });
  // 19. Test 9: Verify pagination metadata
  const paginatedResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate("pagination metadata is valid", () => {
    const { pagination } = paginatedResult;
    return (
      pagination.current >= 1 &&
      pagination.limit > 0 &&
      pagination.records >= 0 &&
      pagination.pages >= 0 &&
      paginatedResult.data.length <= pagination.limit
    );
  });
}
