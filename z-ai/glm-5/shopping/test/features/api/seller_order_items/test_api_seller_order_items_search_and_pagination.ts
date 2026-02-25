import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_seller_order_items_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test that a seller can search order items by product name and order number
  // to quickly locate specific transactions for customer support.
  // 1. Setup: Create admin and seller accounts
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Admin approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // Re-login seller after approval to get proper permissions
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuth = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(sellerLoginAuth);
  // 3. Seller creates first product: "Premium Headphones"
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Premium Headphones",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 199.99,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product1);
  // 4. Add variant to first product with inventory
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: `SKU-HEADPHONES-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: [{ key: "color", value: "Black" }],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant1);
  // 5. Seller creates second product: "Wireless Mouse"
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Wireless Mouse",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 49.99,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product2);
  // 6. Add variant to second product with inventory
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          skuCode: `SKU-MOUSE-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: [{ key: "color", value: "White" }],
          stockQuantity: 50,
        },
      },
    );
  typia.assert(variant2);
  // 7. Create customer and place order
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 8. Customer adds both variants to cart
  const cartItem1 =
    await api.functional.shoppingMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          variantId: variant1.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await api.functional.shoppingMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          variantId: variant2.id,
          quantity: 3,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 9. Customer places order
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        address_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // ========== TEST SCENARIOS ==========
  // Scenario 1: Search by product name (partial match) - "Headphones"
  const searchHeadphones =
    await api.functional.shoppingMall.seller.sellers.me.order_items.index(
      sellerConnection,
      {
        body: {
          search: "Headphones",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(searchHeadphones);
  // Verify only "Premium Headphones" items are returned
  TestValidator.predicate(
    "Search by 'Headphones' returns only matching items",
    searchHeadphones.data.every((item) =>
      item.product_name.includes("Headphones"),
    ),
  );
  // Verify "Wireless Mouse" items are NOT in results
  TestValidator.predicate(
    "Search by 'Headphones' does not return Wireless Mouse items",
    searchHeadphones.data.every((item) => !item.product_name.includes("Mouse")),
  );
  // Scenario 2: Search by order number (partial match)
  const orderNumberPartial = order.order_number.substring(0, 6);
  const searchByOrderNumber =
    await api.functional.shoppingMall.seller.sellers.me.order_items.index(
      sellerConnection,
      {
        body: {
          orderNumber: orderNumberPartial,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(searchByOrderNumber);
  // Verify items from that specific order are returned
  TestValidator.predicate(
    "Search by order number returns items from correct order",
    searchByOrderNumber.data.every(
      (item) => item.order.orderNumber === order.order_number,
    ),
  );
  // Scenario 3: Combined search and filter - "Wireless" AND status=['paid']
  const combinedSearch =
    await api.functional.shoppingMall.seller.sellers.me.order_items.index(
      sellerConnection,
      {
        body: {
          search: "Wireless",
          status: ["paid"],
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Verify only "Wireless Mouse" items with "paid" status are returned
  TestValidator.predicate(
    "Combined search returns only Wireless Mouse items with paid status",
    combinedSearch.data.every(
      (item) =>
        item.product_name.includes("Wireless") && item.status === "paid",
    ),
  );
  // Scenario 4: Search with no results
  const noResultsSearch =
    await api.functional.shoppingMall.seller.sellers.me.order_items.index(
      sellerConnection,
      {
        body: {
          search: "NonExistentProduct",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(noResultsSearch);
  // Verify empty data array
  TestValidator.equals(
    "Search for non-existent product returns empty array",
    noResultsSearch.data.length,
    0,
  );
  // Verify pagination shows records=0, pages=0
  TestValidator.equals(
    "Empty results pagination - records",
    noResultsSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "Empty results pagination - pages",
    noResultsSearch.pagination.pages,
    0,
  );
  // Scenario 5: Pagination with search
  const paginatedSearch =
    await api.functional.shoppingMall.seller.sellers.me.order_items.index(
      sellerConnection,
      {
        body: {
          search: "Premium",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  // Verify pagination metadata is correct
  TestValidator.equals(
    "Pagination current page",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "Pagination limit",
    paginatedSearch.pagination.limit,
    10,
  );
  // Verify only matching items are counted in pagination
  TestValidator.predicate(
    "Pagination records matches filtered results",
    paginatedSearch.pagination.records >= paginatedSearch.data.length,
  );
}
