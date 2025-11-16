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
 * Validates that a customer can view the details of a specific wishlist item,
 * verifying end-to-end permissions and correct data exposure.
 *
 * Steps:
 *
 * 1. Register and authenticate a seller.
 * 2. Create a new product as the seller.
 * 3. Create a new SKU under that product as the seller.
 * 4. Register and authenticate a customer.
 * 5. Create a wishlist as the customer.
 * 6. Add the SKU to the wishlist.
 * 7. Retrieve/validate wishlist item details as the owner customer.
 * 8. Try to access the wishlist item as a different customer and verify access is
 *    denied.
 */
export async function test_api_wishlist_item_detail_by_customer(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword as string & tags.Format<"password">,
      business_name: RandomGenerator.name(2),
      registration_number: RandomGenerator.alphaNumeric(10),
      business_phone: RandomGenerator.mobile(),
      href: "https://seller-join.example.com",
      referrer: "https://landing.example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerJoin);

  // 2. Create a new product as the seller
  const product = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        default_price: 10000,
        business_status: "published",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Create a SKU under the product as the seller
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 12000,
        stock: 10 as number & tags.Type<"int32">,
        status: "active",
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. Register and authenticate a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.MinLength<8> &
    tags.Format<"password">;
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerJoin);

  // 5. Create a wishlist as the customer
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {} satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);

  // 6. Add SKU to the wishlist
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: {
          shopping_mall_product_sku_id: sku.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);

  // 7. Retrieve/validate wishlist item details as the owner
  const itemDetails =
    await api.functional.shoppingMall.customer.wishlists.items.at(connection, {
      wishlistId: wishlist.id,
      itemId: wishlistItem.id,
    });
  typia.assert(itemDetails);
  TestValidator.equals(
    "wishlist item id matches",
    itemDetails.id,
    wishlistItem.id,
  );
  TestValidator.equals(
    "wishlist item SKU id matches",
    itemDetails.productSku.id,
    sku.id,
  );
  TestValidator.equals(
    "wishlist item product title matches",
    itemDetails.productSku.product_title,
    sku.product.title,
  );
  TestValidator.equals(
    "wishlist item product reference id matches",
    itemDetails.productSku.id,
    wishlistItem.productSku.id,
  );

  // 8. Register and authenticate another customer, try to access the other customer's wishlist item
  const otherCustomerEmail = typia.random<string & tags.Format<"email">>();
  const otherCustomerPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.MinLength<8> &
    tags.Format<"password">;
  const otherCustomerJoin = await api.functional.auth.customer.join(
    connection,
    {
      body: {
        email: otherCustomerEmail,
        password: otherCustomerPassword,
        name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    },
  );
  typia.assert(otherCustomerJoin);

  // Switch to other customer (authenticate)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: otherCustomerEmail,
      password: otherCustomerPassword,
      href: "https://wishlist.example.com",
      referrer: "https://landing.example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Attempt to access the original customer's wishlist item, expect error
  await TestValidator.error(
    "other customer cannot access another user's wishlist item",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.at(
        connection,
        {
          wishlistId: wishlist.id,
          itemId: wishlistItem.id,
        },
      );
    },
  );
}
