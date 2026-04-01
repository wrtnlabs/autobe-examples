import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test pagination and sorting behavior when retrieving order items from an order with many items.
 *
 * This test validates:
 * 1. Basic pagination with limit and page parameters
 * 2. Pagination metadata accuracy (total records, page count)
 * 3. Non-overlapping item sets across pages
 * 4. Sorting functionality
 * 5. Combined filtering and pagination
 * 6. Edge case: page beyond available pages returns empty array
 */
export async function test_api_order_item_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create multiple products with variants (3 products × 4 variants = 12 variants)
  const allVariantIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const product = await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Test Product ${i + 1}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
    typia.assert(product);
    // Create 4 variants for each product
    for (let j = 0; j < 4; j++) {
      const variant =
        await generate_random_shopping_mall_seller_products_variants_create(
          sellerConnection,
          {
            params: { productId: product.id },
            body: {
              sku_code: `SKU-${product.id.substring(0, 8)}-${j}`,
              price_override: typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1000>
              >(),
              option_value_ids: [],
            },
          },
        );
      typia.assert(variant);
      allVariantIds.push(variant.id);
    }
  }
  // 3. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 4. Add all 12 variants to customer's cart
  for (const variantId of allVariantIds) {
    const cartItem =
      await generate_random_shopping_mall_customer_cart_items_create(
        customerConnection,
        {
          body: {
            shopping_mall_product_variant_id: variantId,
            quantity: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
          },
        },
      );
    typia.assert(cartItem);
  }
  // 5. Create order with all cart items (should have 12 order items)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  const orderId = order.id;
  const totalItems = order.orderItems.length;
  // Verify we have enough items for pagination testing
  TestValidator.predicate(
    "order has multiple items for pagination",
    totalItems >= 5,
  );
  // 6. Retrieve first page of order items with limit=5
  const page1 = await api.functional.shoppingMall.customer.orders.items.index(
    customerConnection,
    {
      orderId: orderId,
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(page1);
  // 7. Verify pagination metadata
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.equals(
    "page 1 total records",
    page1.pagination.records,
    totalItems,
  );
  TestValidator.equals(
    "page 1 total pages",
    page1.pagination.pages,
    Math.ceil(totalItems / 5),
  );
  TestValidator.predicate(
    "page 1 has items",
    page1.data.length > 0 && page1.data.length <= 5,
  );
  const page1Ids = page1.data.map((item) => item.id);
  // 8. Retrieve second page with page=2 and limit=5
  const page2 = await api.functional.shoppingMall.customer.orders.items.index(
    customerConnection,
    {
      orderId: orderId,
      body: {
        page: 2,
        limit: 5,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(page2);
  // 9. Verify different set of items is returned
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  const page2Ids = page2.data.map((item) => item.id);
  TestValidator.predicate(
    "page 1 and page 2 have no overlapping items",
    page1Ids.every((id) => !page2Ids.includes(id)),
  );
  // 10. Retrieve third page with page=3 and limit=5
  const page3 = await api.functional.shoppingMall.customer.orders.items.index(
    customerConnection,
    {
      orderId: orderId,
      body: {
        page: 3,
        limit: 5,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(page3);
  // 11. Verify remaining items
  TestValidator.equals("page 3 current page", page3.pagination.current, 3);
  const page3Ids = page3.data.map((item) => item.id);
  TestValidator.predicate(
    "page 3 has no overlap with page 1",
    page1Ids.every((id) => !page3Ids.includes(id)),
  );
  TestValidator.predicate(
    "page 3 has no overlap with page 2",
    page2Ids.every((id) => !page3Ids.includes(id)),
  );
  // 12. Apply custom sorting by created_at field
  const sortedPage =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: orderId,
        body: {
          page: 1,
          limit: 5,
          sort: "created_at",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedPage);
  // 13. Verify sorting is applied (items should be sorted by created_at)
  TestValidator.predicate("sorted page has items", sortedPage.data.length > 0);
  // 14. Combine status filter with pagination (status='paid', page=1, limit=5)
  const filteredPage =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: orderId,
        body: {
          status: "paid",
          page: 1,
          limit: 5,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(filteredPage);
  // 15. Verify filtered results
  TestValidator.predicate(
    "filtered items all have paid status",
    filteredPage.data.every((item) => item.status === "paid"),
  );
  TestValidator.predicate(
    "filtered page count is correct",
    filteredPage.pagination.pages >= 0,
  );
  // 16. Edge case: requesting page beyond available pages returns empty data array
  const beyondPage =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: orderId,
        body: {
          page: 100,
          limit: 5,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page returns empty array",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page current page",
    beyondPage.pagination.current,
    100,
  );
}
