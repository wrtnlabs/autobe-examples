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
 * Validate enforcement of wishlist item detail access control.
 *
 * Scenario: Verifies that a customer cannot access another customer's wishlist
 * item, enforcing privacy.
 *
 * Steps:
 *
 * 1. Register and authenticate as customer A (legitimate wishlist owner).
 * 2. Register and authenticate as a seller.
 * 3. Seller creates a product.
 * 4. Seller creates a SKU for the product.
 * 5. Switch to customer A and create a wishlist.
 * 6. Add a wishlist item (with the SKU) to customer A's wishlist.
 * 7. Register and authenticate as customer B (snooper/attacker).
 * 8. Customer B attempts to retrieve customer A's wishlist item.
 * 9. Assert that access is denied—i.e., a permission or ownership error is thrown.
 */
export async function test_api_wishlist_item_detail_access_control(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as customer A
  const emailA = typia.random<string & tags.Format<"email">>();
  const passwordA = RandomGenerator.alphaNumeric(12);
  const customerA = await api.functional.auth.customer.join(connection, {
    body: {
      email: emailA,
      password: passwordA as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerA);

  // 2. Register & authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword as string & tags.Format<"password">,
      business_name: RandomGenerator.name(),
      registration_number: RandomGenerator.alphaNumeric(10),
      business_phone: RandomGenerator.mobile(),
      href: "https://example.com/seller/join",
      referrer: "https://example.com/landing",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 3. Seller creates a product
  const product = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        default_price: 9999,
        business_status: "published",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Seller creates a SKU for the product
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 9999,
        stock: 100,
        status: "active",
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku);

  // 5. Authenticate as customer A again and create wishlist
  await api.functional.auth.customer.login(connection, {
    body: {
      email: emailA,
      password: passwordA,
      href: "https://example.com/customer/re-login",
      referrer: "https://example.com/somepage",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {} satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);

  // 6. Add an item to customer A's wishlist
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

  // 7. Register and authenticate as customer B
  const emailB = typia.random<string & tags.Format<"email">>();
  const passwordB = RandomGenerator.alphaNumeric(12);
  const customerB = await api.functional.auth.customer.join(connection, {
    body: {
      email: emailB,
      password: passwordB as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerB);

  // 8. Customer B attempts to retrieve customer A's wishlist item
  await TestValidator.error(
    "customer B cannot access customer A's wishlist item",
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
