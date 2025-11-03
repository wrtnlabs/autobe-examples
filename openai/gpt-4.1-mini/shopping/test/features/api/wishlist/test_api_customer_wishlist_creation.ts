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

export async function test_api_customer_wishlist_creation(
  connection: api.IConnection,
) {
  // 1. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "Password123!",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "Password123!",
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Seller creates a product
  const productCode = `PRD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 1 }),
        brand: "TestBrand",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Seller creates a SKU for the product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: {
          sku_code: skuCode,
          price: RandomGenerator.alphaNumeric(4).length * 10 || 100,
          attributes_json: JSON.stringify({ color: "red", size: "L" }),
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(sku);

  // 5. Customer creates a shopping cart
  const cart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customer.id,
          shopping_mall_customer_session_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  typia.assert(cart);

  // 6. Customer adds cart item
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      {
        cartId: cart.id,
        body: {
          shopping_mall_product_sku_id: sku.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 7. Customer creates wishlist
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection);
  typia.assert(wishlist);

  TestValidator.predicate(
    "wishlist is owned by customer",
    wishlist.shopping_mall_customer_id === customer.id,
  );

  TestValidator.predicate(
    "wishlist belongs to customer session",
    wishlist.shopping_mall_customer_session_id !== null &&
      wishlist.shopping_mall_customer_session_id !== undefined,
  );

  TestValidator.predicate(
    "wishlist has creation timestamp",
    typeof wishlist.created_at === "string",
  );

  TestValidator.predicate(
    "wishlist has update timestamp",
    typeof wishlist.updated_at === "string",
  );
}
