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
 * Validates deletion of a wishlist item by its owner customer.
 *
 * This test exercises the business and security boundaries around removing an
 * item from a customer wishlist, including multi-actor authentication and
 * enforcement of proper ownership.
 *
 * Steps:
 *
 * 1. Register a seller account and login
 * 2. Seller creates a product and registers a corresponding SKU
 * 3. Register a customer account (customerA) and login
 * 4. CustomerA creates a wishlist
 * 5. CustomerA adds a wishlist item using the SKU
 * 6. CustomerA deletes the wishlist item by ID; verify deletion
 * 7. Register a second customer account (customerB) and login as them
 * 8. CustomerB attempts to delete the wishlist item from CustomerA's wishlist;
 *    expect error
 * 9. Attempt to delete a non-existent item as CustomerA; expect error
 *
 * All outcomes are validated for correct business logic and authorization
 * boundaries.
 */
export async function test_api_wishlist_item_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerBusinessName = RandomGenerator.name();
  const sellerRegNum = RandomGenerator.alphaNumeric(12);
  const sellerBusinessPhone = RandomGenerator.mobile();
  const sellerHref = "https://seller.example.com";
  const sellerReferrer = "https://portal.example.com";
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: sellerBusinessName,
      registration_number: sellerRegNum,
      business_phone: sellerBusinessPhone,
      href: sellerHref,
      referrer: sellerReferrer,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerJoin);

  // 2. Seller creates product + SKU
  const productCreate = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        default_price: 62900,
        business_status: "published",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productCreate);
  const productSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productCreate.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        price: 62900,
        stock: 10,
        status: "active",
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(productSku);

  // 3. Register customerA
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerAPassword = RandomGenerator.alphaNumeric(14);
  const customerAName = RandomGenerator.name();
  const customerAPhone = RandomGenerator.mobile();
  const customerAJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      password: (customerAPassword + "A") as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      name: customerAName,
      phone: customerAPhone,
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerAJoin);

  // CustomerA login
  const customerALogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerAEmail,
      password: customerAPassword + "A",
      href: "https://user.example.com",
      referrer: "https://portal.example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customerALogin);

  // 4. CustomerA creates wishlist
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    { body: {} satisfies IShoppingMallWishlist.ICreate },
  );
  typia.assert(wishlist);

  // 5. CustomerA adds wishlist item
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: {
          shopping_mall_product_sku_id: productSku.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);

  // 6. CustomerA deletes the wishlist item
  await api.functional.shoppingMall.customer.wishlists.items.erase(connection, {
    wishlistId: wishlist.id,
    itemId: wishlistItem.id,
  });

  // 7. Register customerB
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBPassword = RandomGenerator.alphaNumeric(13);
  const customerBName = RandomGenerator.name();
  const customerBPhone = RandomGenerator.mobile();
  const customerBJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      password: (customerBPassword + "B") as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      name: customerBName,
      phone: customerBPhone,
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerBJoin);

  // CustomerB login
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerBEmail,
      password: customerBPassword + "B",
      href: "https://user2.example.com",
      referrer: "https://portal.example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 8. CustomerB attempts to delete CustomerA's wishlist item - expect failure
  await TestValidator.error(
    "deleting another customer's wishlist item should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.erase(
        connection,
        { wishlistId: wishlist.id, itemId: wishlistItem.id },
      );
    },
  );

  // 9. Attempt deleting non-existent item as CustomerA
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerAEmail,
      password: customerAPassword + "A",
      href: "https://user.example.com",
      referrer: "https://portal.example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  await TestValidator.error(
    "deleting a non-existent wishlist item should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.erase(
        connection,
        {
          wishlistId: wishlist.id,
          itemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
