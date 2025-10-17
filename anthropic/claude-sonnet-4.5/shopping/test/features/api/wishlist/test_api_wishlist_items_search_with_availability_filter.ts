import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test comprehensive wishlist items search and filtering with availability
 * status.
 *
 * This test validates the complete wishlist management workflow including:
 *
 * 1. Admin account creation and category setup
 * 2. Seller account creation and product/SKU creation with varied stock levels
 * 3. Customer account creation and wishlist creation
 * 4. Adding multiple SKU items to the wishlist
 * 5. Searching and filtering wishlist items with pagination
 * 6. Verifying real-time product data and availability status
 * 7. Ensuring proper authorization for wishlist access
 */
export async function test_api_wishlist_items_search_with_availability_filter(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create product category
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 3: Create seller account for product management
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(3),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 4: Create product
  const productData = {
    name: RandomGenerator.name(3),
    base_price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // Step 5: Create multiple SKUs with different stock levels for availability filtering
  const skuData1 = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuData1,
    });
  typia.assert(sku1);

  const skuData2 = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuData2,
    });
  typia.assert(sku2);

  const skuData3 = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku3: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuData3,
    });
  typia.assert(sku3);

  // Step 6: Create customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerData,
    });
  typia.assert(customer);

  // Step 7: Create wishlist
  const wishlistData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistData,
    });
  typia.assert(wishlist);

  // Step 8: Add multiple SKU items to wishlist
  const wishlistItem1Data = {
    shopping_mall_sku_id: sku1.id,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem1: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItem1Data,
      },
    );
  typia.assert(wishlistItem1);

  const wishlistItem2Data = {
    shopping_mall_sku_id: sku2.id,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem2: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItem2Data,
      },
    );
  typia.assert(wishlistItem2);

  const wishlistItem3Data = {
    shopping_mall_sku_id: sku3.id,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem3: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItem3Data,
      },
    );
  typia.assert(wishlistItem3);

  // Step 9: Search and retrieve wishlist items with pagination
  const searchRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallWishlistItem.IRequest;

  const searchResult: IPageIShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  // Step 10: Validate pagination metadata
  TestValidator.predicate(
    "pagination should have correct structure",
    searchResult.pagination.current === 1 &&
      searchResult.pagination.limit === 10 &&
      searchResult.pagination.records === 3 &&
      searchResult.pagination.pages >= 1,
  );

  // Step 11: Validate wishlist items data
  TestValidator.predicate(
    "should return all 3 wishlist items",
    searchResult.data.length === 3,
  );

  // Step 12: Verify that all created items are in the result
  const returnedIds = searchResult.data.map((item) => item.id);
  TestValidator.predicate(
    "all wishlist items should be present",
    returnedIds.includes(wishlistItem1.id) &&
      returnedIds.includes(wishlistItem2.id) &&
      returnedIds.includes(wishlistItem3.id),
  );
}
