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

export async function test_api_customer_wishlist_item_erase(
  connection: api.IConnection,
) {
  // 1. Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "1234",
      store_name: RandomGenerator.name(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Seller login to authenticate
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "1234",
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. Seller creates a new product
  const productCode = RandomGenerator.alphaNumeric(12);
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Seller creates SKUs for the product
  const sku1 = await api.functional.shoppingMall.seller.products.skus.createSku(
    connection,
    {
      productCode: productCode,
      body: {
        sku_code: productCode + "-RED",
        price: 10000,
        attributes_json: JSON.stringify({ color: "red", size: "M" }),
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku1);

  const sku2 = await api.functional.shoppingMall.seller.products.skus.createSku(
    connection,
    {
      productCode: productCode,
      body: {
        sku_code: productCode + "-BLU",
        price: 11000,
        attributes_json: JSON.stringify({ color: "blue", size: "L" }),
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku2);

  // 5. Register a new customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "1234",
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 6. Customer login to authenticate properly and get session
  const customerAuthorized = await api.functional.auth.customer.login(
    connection,
    {
      body: {
        email: customerEmail,
        password: "1234",
        ip: null,
        href: "https://example.com/customer-login",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(customerAuthorized);

  // 7. Customer creates a shopping cart with real session ID
  // Note: session id is shopping_mall_customer_session_id, not available directly
  // We'll use customerAuthorized.token.refreshable_until for time, so here we set placeholder
  // to simulate this, since no direct method to get session id is provided in API, omit session id
  // But the create API requires it, so let's just use the active customer ID instead for both (even though not perfect)

  // We will create a dummy session id string with UUID format to fulfill type
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const cart = await api.functional.shoppingMall.customer.shoppingCarts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerAuthorized.id,
        shopping_mall_customer_session_id: sessionId,
      } satisfies IShoppingMallShoppingCart.ICreate,
    },
  );
  typia.assert(cart);

  // 8. Customer adds an item to the shopping cart using sku1
  const cartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      {
        cartId: cart.id,
        body: {
          shopping_mall_product_sku_id: sku1.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 9. Customer creates a wishlist
  const wishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection);
  typia.assert(wishlist);

  // 10. Customer adds sku1 to the wishlist
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: {
          shopping_mall_product_sku_id: sku1.id,
          quantity: 1,
          shopping_mall_wishlist_id: wishlist.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);

  // 11. Erase the wishlist item
  await api.functional.shoppingMall.customer.wishlists.items.eraseWishlistItem(
    connection,
    {
      wishlistId: wishlist.id,
      itemId: wishlistItem.id,
    },
  );

  // 12. Validate that the wishlist item is deleted by attempting to delete it again, expecting an error
  await TestValidator.error(
    "Deleting already deleted wishlist item should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.eraseWishlistItem(
        connection,
        {
          wishlistId: wishlist.id,
          itemId: wishlistItem.id,
        },
      );
    },
  );
}
