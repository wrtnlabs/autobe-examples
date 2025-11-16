import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test updating a wishlist item by the customer owner, enforcing business rules
 * and authorization.
 */
export async function test_api_wishlist_item_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Seller register and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(10);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(),
      registration_number: RandomGenerator.alphaNumeric(10),
      business_phone: RandomGenerator.mobile(),
      href: "https://test.mall/seller",
      referrer: "https://test.mall/",
    },
  });
  typia.assert(seller);

  // 2. Seller creates product
  const product = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        default_price: 10000,
        business_status: "published",
      },
    },
  );
  typia.assert(product);

  // 3. Seller adds two SKUs
  const sku1Code = RandomGenerator.alphaNumeric(8);
  const sku2Code = RandomGenerator.alphaNumeric(9);
  const sku1 = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: sku1Code,
        price: 10000,
        stock: 10,
        status: "active",
      },
    },
  );
  typia.assert(sku1);
  const sku2 = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: sku2Code,
        price: 11000,
        stock: 5,
        status: "active",
      },
    },
  );
  typia.assert(sku2);

  // 4. Register customer and authenticate
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);

  // 5. Customer creates wishlist
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {},
    },
  );
  typia.assert(wishlist);

  // 6. Customer adds sku1 to wishlist
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: { shopping_mall_product_sku_id: sku1.id },
      },
    );
  typia.assert(wishlistItem);

  // 7. Customer updates wishlist item to sku2 (valid update)
  const updatedItem =
    await api.functional.shoppingMall.customer.wishlists.items.update(
      connection,
      {
        wishlistId: wishlist.id,
        itemId: wishlistItem.id,
        body: { shopping_mall_product_sku_id: sku2.id },
      },
    );
  typia.assert(updatedItem);
  TestValidator.equals(
    "wishlist item updated to sku2",
    updatedItem.productSku.id,
    sku2.id,
  );

  // 8. Attempt update to non-existent sku: should error
  const fakeSkuId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update with non-existent sku should be rejected",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.update(
        connection,
        {
          wishlistId: wishlist.id,
          itemId: wishlistItem.id,
          body: { shopping_mall_product_sku_id: fakeSkuId },
        },
      );
    },
  );

  // 9. Add sku1 again to wishlist as new item
  const sku1NewItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: { shopping_mall_product_sku_id: sku1.id },
      },
    );
  typia.assert(sku1NewItem);

  // 10. Attempt to update (duplicate) - updating second item to sku2 (sku2 already in wishlist)
  await TestValidator.error(
    "update causes duplicate sku in wishlist should be rejected",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.update(
        connection,
        {
          wishlistId: wishlist.id,
          itemId: sku1NewItem.id,
          body: { shopping_mall_product_sku_id: sku2.id },
        },
      );
    },
  );

  // 11. Register a second customer
  const otherCustomerEmail = typia.random<string & tags.Format<"email">>();
  const otherCustomerPassword = RandomGenerator.alphaNumeric(12);
  const otherCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email: otherCustomerEmail,
      password: otherCustomerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(otherCustomer);

  // Login as other customer
  await api.functional.auth.customer.login(connection, {
    body: {
      email: otherCustomerEmail,
      password: otherCustomerPassword,
      href: "https://test.mall/customer",
      referrer: "https://test.mall/",
      ip: undefined,
    },
  });

  // Try to update wishlist item as another customer (should be forbidden)
  await TestValidator.error(
    "non-owner customer cannot update wishlist item",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.update(
        connection,
        {
          wishlistId: wishlist.id,
          itemId: wishlistItem.id,
          body: { shopping_mall_product_sku_id: sku1.id },
        },
      );
    },
  );
}
