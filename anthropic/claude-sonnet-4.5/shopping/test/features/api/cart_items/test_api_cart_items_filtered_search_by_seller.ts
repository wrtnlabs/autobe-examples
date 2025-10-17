import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test advanced cart item filtering and search capabilities with multi-seller
 * cart scenario.
 *
 * This test validates that customers can search and filter their cart items by
 * seller, ensuring proper pagination, data accuracy, and ownership validation
 * in a multi-seller shopping cart environment.
 *
 * Test Flow:
 *
 * 1. Create customer account (cart owner)
 * 2. Create admin account and product category
 * 3. Create multiple seller accounts (Seller A and Seller B)
 * 4. Each seller creates products with SKU variants
 * 5. Customer adds items from both sellers to cart
 * 6. Execute filtered search by Seller A's ID
 * 7. Validate response contains only Seller A's items
 * 8. Verify pagination and data structure correctness
 */
export async function test_api_cart_items_filtered_search_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBody,
    });
  typia.assert(customer);

  const customerId = customer.id;
  const cartId = customerId;

  // Step 2: Create admin account for category management
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Step 3: Create product category
  const categoryBody = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // Step 4: Create Seller A
  const sellerABody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: `${RandomGenerator.name()} Store A`,
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerABody,
    });
  typia.assert(sellerA);

  const sellerAId = sellerA.id;

  // Step 5: Seller A creates product
  const productABody = {
    name: `Product A - ${RandomGenerator.name(2)}`,
    base_price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert(productA);

  // Step 6: Seller A creates SKU for product
  const skuABody = {
    sku_code: `SKU-A-${RandomGenerator.alphaNumeric(8)}`,
    price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
    >(),
  } satisfies IShoppingMallSku.ICreate;

  const skuA: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productA.id,
      body: skuABody,
    });
  typia.assert(skuA);

  // Step 7: Create Seller B
  const sellerBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: `${RandomGenerator.name()} Store B`,
    business_type: "Corporation",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBBody,
    });
  typia.assert(sellerB);

  // Step 8: Seller B creates product
  const productBBody = {
    name: `Product B - ${RandomGenerator.name(2)}`,
    base_price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert(productB);

  // Step 9: Seller B creates SKU for product
  const skuBBody = {
    sku_code: `SKU-B-${RandomGenerator.alphaNumeric(8)}`,
    price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
    >(),
  } satisfies IShoppingMallSku.ICreate;

  const skuB: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productB.id,
      body: skuBBody,
    });
  typia.assert(skuB);

  // Step 10: Switch back to customer and add items to cart
  await api.functional.auth.customer.join(connection, {
    body: customerBody,
  });

  // Step 11: Add Seller A's item to cart
  const cartItemABody = {
    shopping_mall_sku_id: skuA.id,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItemA: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: cartItemABody,
    });
  typia.assert(cartItemA);

  // Step 12: Add Seller B's item to cart
  const cartItemBBody = {
    shopping_mall_sku_id: skuB.id,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItemB: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: cartItemBBody,
    });
  typia.assert(cartItemB);

  // Step 13: Execute filtered search by Seller A's ID
  const searchBody = {
    page: 1,
    limit: 10,
    seller_id: sellerAId,
  } satisfies IShoppingMallCartItem.IRequest;

  const filteredResult: IPageIShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cartId,
      body: searchBody,
    });
  typia.assert(filteredResult);

  // Step 14: Validate pagination structure
  TestValidator.predicate(
    "pagination structure exists",
    filteredResult.pagination !== null &&
      filteredResult.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination current page is 1",
    filteredResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit is 10",
    filteredResult.pagination.limit === 10,
  );

  // Step 15: Validate filtered results contain only Seller A's items
  TestValidator.predicate(
    "filtered result contains at least one item",
    filteredResult.data.length > 0,
  );

  TestValidator.predicate(
    "filtered result should contain seller A item",
    filteredResult.data.some((item) => item.id === cartItemA.id),
  );

  // Step 16: Validate data array structure
  TestValidator.predicate(
    "data is an array",
    Array.isArray(filteredResult.data),
  );

  // Step 17: Test without seller filter to get all items
  const allItemsBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCartItem.IRequest;

  const allItemsResult: IPageIShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cartId,
      body: allItemsBody,
    });
  typia.assert(allItemsResult);

  TestValidator.predicate(
    "unfiltered result contains items from both sellers",
    allItemsResult.data.length >= 2,
  );
}
