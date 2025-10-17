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
 * Test the complete flow of a customer creating a wishlist item in their
 * wishlist.
 *
 * Steps included:
 *
 * 1. Customer registers and authenticates.
 * 2. Admin registers and authenticates.
 * 3. Admin creates a product category.
 * 4. Admin creates a seller.
 * 5. Admin creates a product with the created category and seller.
 * 6. Seller registers and authenticates.
 * 7. Seller creates SKU variants.
 * 8. Customer creates a wishlist.
 * 9. Customer adds a SKU as an item to their wishlist.
 * 10. Verify wishlist item creation and permissions.
 */
export async function test_api_wishlist_create_wishlist_item_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins and authenticates
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "1234",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 2. Admin joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password_hash: "1234hashed",
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // Switch to admin authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "1234",
      type: "admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Admin creates product category
  const categoryCode = RandomGenerator.alphaNumeric(6).toUpperCase();
  const categoryCreateBody = {
    code: categoryCode,
    name: RandomGenerator.name(1),
    display_order: 1,
    parent_id: null,
  } satisfies IShoppingMallCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);
  TestValidator.equals(
    "Category code is set correctly",
    category.code,
    categoryCode,
  );

  // 4. Admin creates seller
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "seller_hashed123",
    company_name: RandomGenerator.name(2),
    contact_name: RandomGenerator.name(1),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const seller = await api.functional.shoppingMall.admin.sellers.create(
    connection,
    {
      body: sellerCreateBody,
    },
  );
  typia.assert(seller);

  // 5. Admin creates product with created category and seller
  const productCreateBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: seller.id,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.name(2),
    description: null,
    status: "active",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: productCreateBody,
    },
  );
  typia.assert(product);

  // 6. Seller joins and authenticates
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password_hash: "seller_password",
      company_name: RandomGenerator.name(1),
      contact_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      status: "active",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerJoin);

  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "seller_password",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 7. Seller creates SKU for product
  const skuCreateBody = {
    shopping_mall_product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    price: 10000,
    weight: null,
    status: "active",
  } satisfies IShoppingMallSku.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuCreateBody,
    },
  );
  typia.assert(sku);

  // 8. Customer creates wishlist
  const wishlistCreateBody = {
    shopping_mall_customer_id: customerJoin.id,
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: wishlistCreateBody,
    },
  );
  typia.assert(wishlist);

  // 9. Customer adds a SKU as wishlist item to their wishlist
  const wishlistItemCreateBody = {
    shopping_mall_wishlist_id: wishlist.id,
    shopping_mall_sku_id: sku.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IShoppingMallWishlistItem.ICreate;
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlists.wishlistItems.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemCreateBody,
      },
    );
  typia.assert(wishlistItem);
  TestValidator.equals(
    "Wishlist item belongs to correct wishlist",
    wishlistItem.shopping_mall_wishlist_id,
    wishlist.id,
  );
  TestValidator.equals(
    "Wishlist item references correct SKU",
    wishlistItem.shopping_mall_sku_id,
    sku.id,
  );

  // 10. Verify unauthorized cannot create wishlist items
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Unauthorized user cannot add wishlist items",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.wishlistItems.create(
        unauthorizedConnection,
        {
          wishlistId: wishlist.id,
          body: wishlistItemCreateBody,
        },
      );
    },
  );
}
