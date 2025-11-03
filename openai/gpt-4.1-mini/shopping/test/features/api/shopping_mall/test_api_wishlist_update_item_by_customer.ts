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
 * Test the update of a wishlist item by a customer.
 *
 * This test covers the full flow starting from seller and customer
 * registration, product and SKU creation, shopping cart and cart item creation,
 * wishlist and wishlist item creation, and finally updating a wishlist item's
 * quantity.
 *
 * Detailed steps:
 *
 * 1. Seller registers and logs in.
 * 2. Seller creates a product.
 * 3. Seller creates SKU variants for the product.
 * 4. Customer registers and logs in.
 * 5. Customer creates a shopping cart.
 * 6. Customer adds items to the shopping cart referencing the SKUs.
 * 7. Customer creates a wishlist.
 * 8. Customer adds wishlist items.
 * 9. Customer updates a wishlist item quantity.
 * 10. The update response is validated to match the changes.
 *
 * All intermediate and final entities are typia.asserted to ensure type
 * correctness.
 */
export async function test_api_wishlist_update_item_by_customer(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "1234",
      store_name: RandomGenerator.name(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(),
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert(product);

  // 3. Seller creates SKU variants
  const sku1Body = {
    sku_code: RandomGenerator.alphaNumeric(10),
    price: 1000 + Math.floor(Math.random() * 5000),
    attributes_json: JSON.stringify({ color: "red", size: "M" }),
  } satisfies IShoppingMallProductSku.ICreate;
  const sku1 = await api.functional.shoppingMall.seller.products.skus.createSku(
    connection,
    { productCode: product.code, body: sku1Body },
  );
  typia.assert(sku1);

  const sku2Body = {
    sku_code: RandomGenerator.alphaNumeric(10),
    price: 1000 + Math.floor(Math.random() * 5000),
    attributes_json: JSON.stringify({ color: "blue", size: "L" }),
  } satisfies IShoppingMallProductSku.ICreate;
  const sku2 = await api.functional.shoppingMall.seller.products.skus.createSku(
    connection,
    { productCode: product.code, body: sku2Body },
  );
  typia.assert(sku2);

  // 4. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "1234",
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 5. Customer creates a shopping cart
  // Since the customer session ID is required and not explicitly provided,
  // we assume the current token's refreshable_until string (UUID format assumption)
  // is used as session ID for test purposes.
  const customerSessionId = customer.token.refreshable_until;
  const shoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customer.id,
          shopping_mall_customer_session_id:
            customerSessionId satisfies string as string,
        } satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  typia.assert(shoppingCart);

  // 6. Customer adds items to shopping cart
  const cartItem1 =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      {
        cartId: shoppingCart.id,
        body: {
          shopping_mall_product_sku_id: sku1.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);

  const cartItem2 =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      {
        cartId: shoppingCart.id,
        body: {
          shopping_mall_product_sku_id: sku2.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);

  // 7. Customer creates a wishlist
  const wishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection);
  typia.assert(wishlist);

  // 8. Customer adds wishlist items
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: {
          shopping_mall_product_sku_id: sku1.id,
          quantity: 3,
          shopping_mall_wishlist_id: wishlist.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);

  // 9. Customer updates wishlist item quantity
  const updateBody = {
    quantity: 5,
  } satisfies IShoppingMallWishlistItem.IUpdate;

  const updatedWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.updateWishlistItem(
      connection,
      {
        wishlistId: wishlist.id,
        itemId: wishlistItem.id,
        body: updateBody,
      },
    );
  typia.assert(updatedWishlistItem);

  // 10. Validate update
  TestValidator.equals(
    "updated wishlist item quantity",
    updatedWishlistItem.quantity,
    updateBody.quantity,
  );
}
