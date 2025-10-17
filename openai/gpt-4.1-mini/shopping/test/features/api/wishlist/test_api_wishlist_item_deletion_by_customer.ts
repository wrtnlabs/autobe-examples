import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_wishlist_item_deletion_by_customer(
  connection: api.IConnection,
) {
  // Clone connection object for independent user sessions
  const customerConnection: api.IConnection = { ...connection, headers: {} };
  const otherCustomerConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 1. Customer registration and authentication
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallCustomer.IJoin;

  const authorizedCustomer = await api.functional.auth.customer.join(
    customerConnection,
    {
      body: customerJoinBody,
    },
  );
  typia.assert(authorizedCustomer);

  // 2. Create actual customer account linked to the auth
  const customerCreateBody = {
    email: authorizedCustomer.email,
    password_hash: authorizedCustomer.password_hash,
    nickname: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer = await api.functional.shoppingMall.customers.create(
    customerConnection,
    {
      body: customerCreateBody,
    },
  );
  typia.assert(customer);

  // 3. Seller creates a product
  const productCreateBody = {
    shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "draft",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productCreateBody,
    },
  );
  typia.assert(product);

  // 4. Create multiple SKU variants for the product
  const sku1CreateBody = {
    shopping_mall_product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(8),
    price: (10 + Math.floor(Math.random() * 90)) * 100, // price from 1000 to 10000
    weight: 500,
    status: "draft",
  } satisfies IShoppingMallSku.ICreate;

  const sku1 = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: sku1CreateBody,
    },
  );
  typia.assert(sku1);

  const sku2CreateBody = {
    shopping_mall_product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(8),
    price: (10 + Math.floor(Math.random() * 90)) * 100,
    weight: 600,
    status: "draft",
  } satisfies IShoppingMallSku.ICreate;

  const sku2 = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: sku2CreateBody,
    },
  );
  typia.assert(sku2);

  // 5. Create a wishlist for the customer
  const wishlistCreateBody = {
    shopping_mall_customer_id: customer.id,
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    customerConnection,
    {
      body: wishlistCreateBody,
    },
  );
  typia.assert(wishlist);

  // 6. Add wishlist items to the wishlist
  const wishlistItem1CreateBody = {
    shopping_mall_wishlist_id: wishlist.id,
    shopping_mall_sku_id: sku1.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem1 =
    await api.functional.shoppingMall.customer.wishlists.wishlistItems.create(
      customerConnection,
      {
        wishlistId: wishlist.id,
        body: wishlistItem1CreateBody,
      },
    );
  typia.assert(wishlistItem1);

  const wishlistItem2CreateBody = {
    shopping_mall_wishlist_id: wishlist.id,
    shopping_mall_sku_id: sku2.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem2 =
    await api.functional.shoppingMall.customer.wishlists.wishlistItems.create(
      customerConnection,
      {
        wishlistId: wishlist.id,
        body: wishlistItem2CreateBody,
      },
    );
  typia.assert(wishlistItem2);

  // 7. Delete one wishlist item (wishlistItem1) as owning customer
  await api.functional.shoppingMall.customer.wishlists.wishlistItems.eraseWishlistItem(
    customerConnection,
    {
      wishlistId: wishlist.id,
      wishlistItemId: wishlistItem1.id,
    },
  );

  // 8. Try to delete the same wishlist item again to confirm deletion (error expected)
  await TestValidator.error(
    "should not delete already deleted wishlist item",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.wishlistItems.eraseWishlistItem(
        customerConnection,
        {
          wishlistId: wishlist.id,
          wishlistItemId: wishlistItem1.id,
        },
      );
    },
  );

  // 9. Authorization test: another customer cannot delete wishlist items from this wishlist
  // Register and authenticate a second customer user
  const otherJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallCustomer.IJoin;

  const otherAuthorized = await api.functional.auth.customer.join(
    otherCustomerConnection,
    {
      body: otherJoinBody,
    },
  );
  typia.assert(otherAuthorized);

  const otherCreateBody = {
    email: otherAuthorized.email,
    password_hash: otherAuthorized.password_hash,
    nickname: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;

  const otherCustomer = await api.functional.shoppingMall.customers.create(
    otherCustomerConnection,
    {
      body: otherCreateBody,
    },
  );
  typia.assert(otherCustomer);

  // Try unauthorized deletion of wishlistItem2 by second customer
  await TestValidator.error(
    "unauthorized customer cannot delete wishlist item",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.wishlistItems.eraseWishlistItem(
        otherCustomerConnection,
        {
          wishlistId: wishlist.id,
          wishlistItemId: wishlistItem2.id,
        },
      );
    },
  );
}
