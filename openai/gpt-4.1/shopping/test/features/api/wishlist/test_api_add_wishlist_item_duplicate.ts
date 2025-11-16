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
 * Test that a customer cannot add a duplicate SKU to their wishlist.
 *
 * 1. Register a seller, authenticate, and create a product as seller.
 * 2. Add a SKU to the product (as seller).
 * 3. Register a customer account and authenticate as customer.
 * 4. Create a new wishlist for the customer.
 * 5. Add the SKU to the wishlist successfully.
 * 6. Attempt to add the same SKU again to the wishlist. The system must enforce
 *    duplicate prevention and produce an error response.
 * 7. Confirm the wishlist item count did not increase after duplicate attempt.
 */
export async function test_api_add_wishlist_item_duplicate(
  connection: api.IConnection,
) {
  // Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword as string & tags.Format<"password">,
        business_name: RandomGenerator.name(),
        registration_number: RandomGenerator.alphaNumeric(10),
        business_phone: RandomGenerator.mobile(),
        href: "https://seller-join.test/", // Any dummy URI
        referrer: "https://landing.test/",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Create product as seller
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.products.create(connection, {
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.content({ paragraphs: 1 }),
        default_price: 19900,
        business_status: "published",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Add a SKU to the product
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 19900,
        stock: 123,
        status: "active",
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(sku);

  // Register and login customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.MinLength<8> &
    tags.Format<"password">;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);
  // For safety, login
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://customer-login.test/",
      referrer: "https://main.test/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Create wishlist for the customer
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {} satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(wishlist);

  // Add SKU to wishlist (first time, should succeed)
  const addResult: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: {
          shopping_mall_product_sku_id: sku.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(addResult);

  // Attempt to add the SKU again — should fail due to duplicate prevention
  await TestValidator.error(
    "cannot add duplicate SKU to wishlist",
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
