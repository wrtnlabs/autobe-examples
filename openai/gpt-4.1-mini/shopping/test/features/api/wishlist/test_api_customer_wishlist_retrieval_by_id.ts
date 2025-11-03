import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Retrieve detailed information of a specific wishlist by UUID.
 *
 * This test performs full setup of seller, product, SKUs, customer with
 * session, shopping cart with items, and finally a wishlist creation. It then
 * retrieves the wishlist by ID and validates all aspects including ownership,
 * session linkage, nested wishlist items, and timestamps.
 *
 * Scenario:
 *
 * 1. Seller joins and authenticates
 * 2. Seller creates a product
 * 3. Seller creates SKUs for the product
 * 4. Customer joins and authenticates
 * 5. Customer logins to create session
 * 6. Customer creates a shopping cart
 * 7. Customer adds items (product SKUs) to the shopping cart
 * 8. Customer creates a wishlist
 * 9. Retrieve the wishlist by its UUID
 * 10. Validate wishlist details, ownership, linked session, items correctness, and
 *     timestamps
 */
export async function test_api_customer_wishlist_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Seller joins and authenticates
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "password1234",
        store_name: RandomGenerator.name(3),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Seller creates a product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 3. Seller creates SKUs for the product
  const sku1: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: product.code,
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          price:
            1000 +
            typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<100> &
                tags.Maximum<10000>
            >(),
          attributes_json: JSON.stringify({ color: "red", size: "M" }),
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(sku1);

  const sku2: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: product.code,
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          price:
            1000 +
            typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<100> &
                tags.Maximum<10000>
            >(),
          attributes_json: JSON.stringify({ color: "blue", size: "L" }),
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(sku2);

  // 4. Customer joins and authenticates
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "password1234",
        nickname: RandomGenerator.name(2),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerJoined);

  // 5. Customer logins to create session
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: "password1234",
        href: "https://test.nowhere/", // mandatory URL string
        referrer: "https://test.nowhere/start",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(customer);

  // 6. Customer creates a shopping cart
  const cart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customer.id,
          shopping_mall_customer_session_id: customer.token
            .access satisfies string as string, // apparently token.access is reused as session ID here
        } satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  typia.assert(cart);

  // 7. Customer adds items (SKUs) to the shopping cart
  const cartItem1: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      {
        cartId: cart.id,
        body: {
          shopping_mall_product_sku_id: sku1.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);

  const cartItem2: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      {
        cartId: cart.id,
        body: {
          shopping_mall_product_sku_id: sku2.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);

  // 8. Customer creates a wishlist
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection);
  typia.assert(wishlist);

  // 9. Retrieve the wishlist by its UUID
  const readWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.at(connection, {
      id: wishlist.id,
    });
  typia.assert(readWishlist);

  // 10. Validate wishlist details
  TestValidator.equals("wishlist id matches", readWishlist.id, wishlist.id);
  TestValidator.equals(
    "wishlist customer id matches",
    readWishlist.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "wishlist session id matches",
    readWishlist.shopping_mall_customer_session_id,
    cart.shopping_mall_customer_session_id,
  );
  TestValidator.predicate(
    "wishlist created_at is a valid date",
    !isNaN(Date.parse(readWishlist.created_at)),
  );
  TestValidator.predicate(
    "wishlist updated_at is a valid date",
    !isNaN(Date.parse(readWishlist.updated_at)),
  );
  TestValidator.equals(
    "wishlist deleted_at is null",
    readWishlist.deleted_at,
    null,
  );
  TestValidator.predicate(
    "wishlist items is an array",
    Array.isArray(readWishlist.shopping_mall_wishlist_items),
  );
}
