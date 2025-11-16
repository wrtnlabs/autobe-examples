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
 * Test the error handling when attempting to fetch a non-existent wishlist item
 * by ID.
 *
 * Steps:
 *
 * 1. Register a new seller.
 * 2. Seller logs in.
 * 3. Seller creates a product.
 * 4. Seller creates a SKU for the product.
 * 5. Register a new customer.
 * 6. Customer logs in.
 * 7. Customer creates a wishlist (no items added).
 * 8. Attempt to fetch a wishlist item with a random, valid UUID as the itemId.
 * 9. Expect an error indicating item does not exist or is not accessible.
 */
export async function test_api_wishlist_item_detail_nonexistent(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPW!" + RandomGenerator.alphaNumeric(8);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(2),
      registration_number: RandomGenerator.alphaNumeric(12),
      business_phone: RandomGenerator.mobile(),
      href: "https://example.com/join/seller",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerJoin);

  // 2. Seller logs in
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/login/seller",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. Seller creates a product
  const product = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        default_price: 4000,
        business_status: "published",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Seller creates a SKU for that product
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 4000,
        stock: 20,
        status: "active",
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku);

  // 5. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPW!" + RandomGenerator.alphaNumeric(8);
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerJoin);

  // 6. Customer logs in
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/login/customer",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 7. Customer creates a wishlist (starts empty)
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {} satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);

  // 8. Attempt to fetch a wishlist item with a random, validly formatted but non-existent itemId
  const randomItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent wishlist item should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.at(
        connection,
        {
          wishlistId: wishlist.id,
          itemId: randomItemId,
        },
      );
    },
  );
}
