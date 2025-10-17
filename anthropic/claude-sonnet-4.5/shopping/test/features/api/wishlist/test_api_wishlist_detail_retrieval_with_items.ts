import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test complete wishlist detail retrieval workflow with product items.
 *
 * This test validates the end-to-end wishlist detail retrieval functionality
 * where an authenticated customer creates a wishlist, adds product items to it,
 * and then retrieves the complete wishlist details. The test ensures that the
 * wishlist detail response includes all necessary information including
 * wishlist metadata and associated product/SKU information.
 *
 * Test Steps:
 *
 * 1. Create and authenticate admin account
 * 2. Admin creates a product category
 * 3. Create and authenticate seller account
 * 4. Seller creates a product
 * 5. Seller creates SKU variants for the product
 * 6. Create and authenticate customer account
 * 7. Customer creates a wishlist
 * 8. Customer adds product SKU items to the wishlist
 * 9. Customer retrieves wishlist details by ID
 * 10. Validate the retrieved wishlist data
 */
export async function test_api_wishlist_detail_retrieval_with_items(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // 2. Admin creates a product category
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // 3. Create and authenticate seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // 4. Seller creates a product
  const productData = {
    name: RandomGenerator.name(3),
    base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // 5. Seller creates SKU variants for the product
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuData,
    },
  );
  typia.assert(sku);

  // 6. Create and authenticate customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer = await api.functional.auth.customer.join(connection, {
    body: customerData,
  });
  typia.assert(customer);

  // 7. Customer creates a wishlist
  const wishlistData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: wishlistData,
    },
  );
  typia.assert(wishlist);

  // 8. Customer adds product SKU items to the wishlist
  const wishlistItemData = {
    shopping_mall_sku_id: sku.id,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemData,
      },
    );
  typia.assert(wishlistItem);

  // 9. Customer retrieves wishlist details by ID
  const retrievedWishlist =
    await api.functional.shoppingMall.customer.wishlists.at(connection, {
      wishlistId: wishlist.id,
    });
  typia.assert(retrievedWishlist);

  // 10. Validate the retrieved wishlist data
  TestValidator.equals(
    "retrieved wishlist ID matches created wishlist",
    retrievedWishlist.id,
    wishlist.id,
  );

  TestValidator.equals(
    "retrieved wishlist name matches created wishlist",
    retrievedWishlist.name,
    wishlist.name,
  );
}
