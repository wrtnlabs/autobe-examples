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
 * Validate successful workflow for adding a valid SKU to a customer's wishlist.
 *
 * This end-to-end test covers the following steps:
 *
 * 1. Register a new customer (includes authentication on join)
 * 2. Register a new seller and authenticate as seller
 * 3. Seller creates a new product
 * 4. Seller creates a SKU for the product
 * 5. Authenticate as the customer again (to switch actor)
 * 6. Customer creates a wishlist
 * 7. Customer adds the product SKU to the wishlist via POST
 *    /shoppingMall/customer/wishlists/{wishlistId}/items
 * 8. Validate that the wishlist item response references the correct SKU summary
 *    and associations
 * 9. Validate that duplicate inserts throw an error (duplicate constraint
 *    enforcement)
 */
export async function test_api_add_wishlist_item_success(
  connection: api.IConnection,
) {
  // 1. Register customer (auto-authenticates)
  const customer_email = typia.random<string & tags.Format<"email">>();
  const customer_password = RandomGenerator.alphabets(12);
  const customer_join = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer_email,
      password: customer_password,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer_join);
  const customer_id = customer_join.id;

  // 2. Register seller and login
  const seller_email = typia.random<string & tags.Format<"email">>();
  const seller_password = RandomGenerator.alphabets(14);
  const seller_join = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller_email,
      password: seller_password satisfies string as string, // typia tagging workaround
      business_name: RandomGenerator.name(),
      registration_number: RandomGenerator.alphaNumeric(10),
      business_phone: RandomGenerator.mobile(),
      href: "https://seller-join.example.com",
      referrer: "https://entry.example.com",
      ip: undefined,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller_join);

  // 3. Seller creates product
  const product = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 10,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 12,
          wordMin: 3,
          wordMax: 8,
        }),
        default_price: Math.floor(Math.random() * 10000) + 500,
        business_status: "published",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Seller creates SKU for product
  const sku_code = RandomGenerator.alphaNumeric(10);
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code,
        price: product.default_price + 100,
        stock: 15,
        status: "active",
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku);

  // 5. Switch back to customer by logging in
  const customer_login = await api.functional.auth.customer.login(connection, {
    body: {
      email: customer_email,
      password: customer_password,
      href: "https://customer-login.example.com",
      referrer: "https://shop.example.com",
      ip: undefined,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customer_login);

  // 6. Customer creates wishlist
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {} satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);

  // 7. Customer adds product SKU to wishlist
  const wishlist_item =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: {
          shopping_mall_product_sku_id: sku.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlist_item);

  // 8. Validate correct SKU association on wishlist item
  TestValidator.equals(
    "wishlist item SKU id matches",
    wishlist_item.productSku.id,
    sku.id,
  );
  TestValidator.equals(
    "wishlist item SKU code matches",
    wishlist_item.productSku.code,
    sku.sku_code,
  );
  TestValidator.equals(
    "wishlist item SKU product title matches",
    wishlist_item.productSku.product_title,
    product.title,
  );

  // 9. Attempt duplicate insert (should be rejected by unique constraint)
  await TestValidator.error(
    "duplicate SKU in wishlist should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.create(
        connection,
        {
          wishlistId: wishlist.id,
          body: {
            shopping_mall_product_sku_id: sku.id,
          } satisfies IShoppingMallWishlistItem.ICreate,
        },
      );
    },
  );
}
