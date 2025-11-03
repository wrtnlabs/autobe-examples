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
 * Validates the update functionality of a customer's wishlist.
 *
 * This test simulates the entire workflow of multiple actors interacting with
 * the system:
 *
 * - Registers two customers and one seller user
 * - Seller creates a product and SKU
 * - Customer1 logs in, creates a shopping cart and adds a SKU
 * - Customer1 creates and then updates a wishlist
 * - Validates successful update and negative authorization and existence checks
 *
 * The test ensures data integrity, correct authentication handling, and
 * ownership enforcement.
 */
export async function test_api_wishlist_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Register first customer user (customer1)
  const customerEmail1 = typia.random<string & tags.Format<"email">>();
  const customer1: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail1,
        password: "Abcd1234!",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer1);

  // 2. Customer1 logins to get session context
  const login1: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail1,
        password: "Abcd1234!",
        href: "https://example.com/current",
        referrer: "https://example.com/referrer",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(login1);

  // 3. Register second customer user (customer2) and login
  const customerEmail2 = typia.random<string & tags.Format<"email">>();
  const customer2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail2,
        password: "Abcd1234!",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer2);

  const login2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail2,
        password: "Abcd1234!",
        href: "https://example.com/current",
        referrer: "https://example.com/referrer",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(login2);

  // 4. Register seller user
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "Seller1234!",
        store_name: RandomGenerator.name(2),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 5. Seller creates a product
  const productName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const productDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 8,
    wordMin: 4,
    wordMax: 8,
  });
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: productName,
        description: productDescription,
        brand: "TestBrand",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Seller creates SKU variant for the product
  const skuCode = `${product.code}-${RandomGenerator.alphaNumeric(4).toUpperCase()}`;
  const skuPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const skuAttributesJson = JSON.stringify({ color: "red", size: "M" });
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: product.code,
        body: {
          sku_code: skuCode,
          price: skuPrice,
          attributes_json: skuAttributesJson,
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(sku);

  // 7. Customer1 creates a shopping cart with a generated realistic session ID
  const customerSessionId = typia.random<string & tags.Format<"uuid">>();
  const cart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customer1.id,
          shopping_mall_customer_session_id: customerSessionId,
        } satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  typia.assert(cart);

  // 8. Add SKU to the customer1's cart
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      {
        cartId: cart.id,
        body: {
          shopping_mall_product_sku_id: sku.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 9. Customer1 creates a wishlist
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection);
  typia.assert(wishlist);

  // 10. Customer1 updates the wishlist
  const now = new Date().toISOString();
  const updatePayload: IShoppingMallWishlist.IUpdate = {
    id: wishlist.id,
    shopping_mall_customer_id: customer1.id,
    shopping_mall_customer_session_id: customerSessionId,
    created_at: wishlist.created_at,
    updated_at: now,
    deleted_at: null,
  };
  const updatedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      id: wishlist.id,
      body: updatePayload,
    });
  typia.assert(updatedWishlist);

  // 11. Validation: the updated wishlist id must match the original
  TestValidator.equals(
    "wishlist id should stay the same",
    updatedWishlist.id,
    wishlist.id,
  );

  // 12. Validation: the updated_at timestamp should be updated
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedWishlist.updated_at,
    wishlist.updated_at,
  );

  // 13. Negative tests: Switch to customer2 and try to update the wishlist
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail2,
      password: "Abcd1234!",
      href: "https://example.com/current",
      referrer: "https://example.com/referrer",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  await TestValidator.error(
    "customer2 should not update customer1's wishlist",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.update(connection, {
        id: wishlist.id,
        body: updatePayload,
      });
    },
  );

  // 14. Negative test: Update non-existent wishlist
  const fakeWishlistId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail to update non-existent wishlist",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.update(connection, {
        id: fakeWishlistId,
        body: {
          ...updatePayload,
          id: fakeWishlistId,
        },
      });
    },
  );
}
