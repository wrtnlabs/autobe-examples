import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_cart_search_filter_sort(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Admin approves seller
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Create and approve seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: `TestShop_${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  typia.assert(sellerAuth);
  // Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // Re-login as seller to get updated approved status
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerAuth.token.refresh,
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(sellerLogin);
  // Get category for product creation
  const category = typia.random<IShoppingMallCategory.ISummary>();
  // Create multiple products with different names and prices
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: `Apple Phone Case ${RandomGenerator.alphaNumeric(4)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 15000,
        category_id: category.id,
      },
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: `Banana Charger ${RandomGenerator.alphaNumeric(4)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 25000,
        category_id: category.id,
      },
    },
  );
  typia.assert(product2);
  const product3 = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: `Cherry Headphones ${RandomGenerator.alphaNumeric(4)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 35000,
        category_id: category.id,
      },
    },
  );
  typia.assert(product3);
  const product4 = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: `Durian Speaker ${RandomGenerator.alphaNumeric(4)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 45000,
        category_id: category.id,
      },
    },
  );
  typia.assert(product4);
  // Create variants for each product
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: `SKU-APPLE-${RandomGenerator.alphaNumeric(6)}`,
          price: 15000,
          optionValues: [{ key: "color", value: "Red" }],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product2.id },
        body: {
          skuCode: `SKU-BANANA-${RandomGenerator.alphaNumeric(6)}`,
          price: 25000,
          optionValues: [{ key: "color", value: "Blue" }],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant2);
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product3.id },
        body: {
          skuCode: `SKU-CHERRY-${RandomGenerator.alphaNumeric(6)}`,
          price: 35000,
          optionValues: [{ key: "color", value: "Green" }],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant3);
  const variant4 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product4.id },
        body: {
          skuCode: `SKU-DURIAN-${RandomGenerator.alphaNumeric(6)}`,
          price: 45000,
          optionValues: [{ key: "color", value: "Yellow" }],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant4);
  // Add inventory to all variants
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerLoginConnection,
    {
      params: { variantId: variant1.id },
      body: { quantity: 100, reason: "Initial stock" },
    },
  );
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerLoginConnection,
    {
      params: { variantId: variant2.id },
      body: { quantity: 100, reason: "Initial stock" },
    },
  );
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerLoginConnection,
    {
      params: { variantId: variant3.id },
      body: { quantity: 100, reason: "Initial stock" },
    },
  );
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerLoginConnection,
    {
      params: { variantId: variant4.id },
      body: { quantity: 100, reason: "Initial stock" },
    },
  );
  // Create customer and add cart items
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Add cart items with different quantities
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: { variantId: variant1.id, quantity: 2 },
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: { variantId: variant2.id, quantity: 5 },
      },
    );
  typia.assert(cartItem2);
  const cartItem3 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: { variantId: variant3.id, quantity: 1 },
      },
    );
  typia.assert(cartItem3);
  const cartItem4 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: { variantId: variant4.id, quantity: 3 },
      },
    );
  typia.assert(cartItem4);
  // Wait for cart items to be ready
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test 1: Search by product name (partial match)
  const searchResult = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: { search: "Apple" },
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search finds matching product",
    searchResult.data.length === 1,
  );
  TestValidator.predicate(
    "search result contains Apple",
    searchResult.data[0].product.name.includes("Apple"),
  );
  // Test 2: Filter by availability_status
  const availableResult = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: { availability_status: "available" },
    },
  );
  typia.assert(availableResult);
  TestValidator.predicate(
    "all available items have sufficient stock",
    availableResult.data.every(
      (item) => item.availability_status === "available",
    ),
  );
  // Test 3: Filter by price range
  const priceRangeResult =
    await api.functional.shoppingMall.customer.cart.index(customerConnection, {
      body: { min_price: 20000, max_price: 40000 },
    });
  typia.assert(priceRangeResult);
  TestValidator.predicate(
    "price range filter works",
    priceRangeResult.data.every(
      (item) => item.unit_price >= 20000 && item.unit_price <= 40000,
    ),
  );
  // Test 4: Sort by created_at ascending
  const oldestFirst = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: { sort: "created_at", order: "asc" },
    },
  );
  typia.assert(oldestFirst);
  if (oldestFirst.data.length >= 2) {
    TestValidator.predicate(
      "created_at asc order correct",
      new Date(oldestFirst.data[0].created_at) <=
        new Date(oldestFirst.data[1].created_at),
    );
  }
  // Test 5: Sort by created_at descending
  const newestFirst = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: { sort: "created_at", order: "desc" },
    },
  );
  typia.assert(newestFirst);
  if (newestFirst.data.length >= 2) {
    TestValidator.predicate(
      "created_at desc order correct",
      new Date(newestFirst.data[0].created_at) >=
        new Date(newestFirst.data[1].created_at),
    );
  }
  // Test 6: Sort by unit_price ascending
  const cheapestFirst = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: { sort: "unit_price", order: "asc" },
    },
  );
  typia.assert(cheapestFirst);
  if (cheapestFirst.data.length >= 2) {
    TestValidator.predicate(
      "unit_price asc order correct",
      cheapestFirst.data[0].unit_price <= cheapestFirst.data[1].unit_price,
    );
  }
  // Test 7: Sort by unit_price descending
  const expensiveFirst = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: { sort: "unit_price", order: "desc" },
    },
  );
  typia.assert(expensiveFirst);
  if (expensiveFirst.data.length >= 2) {
    TestValidator.predicate(
      "unit_price desc order correct",
      expensiveFirst.data[0].unit_price >= expensiveFirst.data[1].unit_price,
    );
  }
  // Test 8: Sort by quantity ascending
  const leastQtyFirst = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: { sort: "quantity", order: "asc" },
    },
  );
  typia.assert(leastQtyFirst);
  if (leastQtyFirst.data.length >= 2) {
    TestValidator.predicate(
      "quantity asc order correct",
      leastQtyFirst.data[0].quantity <= leastQtyFirst.data[1].quantity,
    );
  }
  // Test 9: Sort by quantity descending
  const mostQtyFirst = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: { sort: "quantity", order: "desc" },
    },
  );
  typia.assert(mostQtyFirst);
  if (mostQtyFirst.data.length >= 2) {
    TestValidator.predicate(
      "quantity desc order correct",
      mostQtyFirst.data[0].quantity >= mostQtyFirst.data[1].quantity,
    );
  }
  // Test 10: Pagination - first page
  const page1 = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: { page: 1, limit: 2 },
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 has 2 items", page1.data.length, 2);
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 2);
  // Test 11: Pagination - second page
  const page2 = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: { page: 2, limit: 2 },
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 has 2 items", page2.data.length, 2);
  TestValidator.equals(
    "pagination current page 2",
    page2.pagination.current,
    2,
  );
  // Test 12: Pagination metadata accuracy
  const allItems = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: { limit: 100 },
    },
  );
  typia.assert(allItems);
  TestValidator.equals(
    "total records match",
    page1.pagination.records,
    allItems.pagination.records,
  );
  const expectedPages = Math.ceil(allItems.pagination.records / 2);
  TestValidator.equals(
    "pages calculation correct",
    page1.pagination.pages,
    expectedPages,
  );
  // Test 13: Combined filters - search + price range
  const combinedResult = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: { search: "Banana", min_price: 20000, max_price: 30000 },
    },
  );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filter works",
    combinedResult.data.every(
      (item) =>
        item.product.name.includes("Banana") &&
        item.unit_price >= 20000 &&
        item.unit_price <= 30000,
    ),
  );
  // Test 14: Combined filters - availability + sort
  const availableSorted = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: {
        availability_status: "available",
        sort: "unit_price",
        order: "asc",
      },
    },
  );
  typia.assert(availableSorted);
  TestValidator.predicate(
    "available + sort combined",
    availableSorted.data.every(
      (item) => item.availability_status === "available",
    ),
  );
}
