import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Validate basic retrieval of a wishlist item detail owned by a customer.
 *
 * Business flow:
 *
 * 1. Register a customer via /auth/customer/join (this also authenticates them).
 * 2. Register a seller via /auth/seller/join and keep seller email for later
 *    login.
 * 3. Register an admin via /auth/admin/join and keep admin email for later login.
 * 4. As the seller, create a product via /shoppingMall/seller/products.
 * 5. As the admin, create a skuInventoryState via
 *    /shoppingMall/admin/skuInventoryStates.
 * 6. As the seller, create a SKU for the product via
 *    /shoppingMall/seller/products/{productId}/skus using the inventory state
 *    id.
 * 7. As the customer, create a wishlist via /shoppingMall/customer/wishlists.
 * 8. As the customer, create a wishlist item in that wishlist pointing to the
 *    product and SKU.
 * 9. As the same customer, call GET
 *    /shoppingMall/customer/wishlists/{wishlistId}/items/{wishlistItemId}.
 * 10. Assert that the returned IShoppingMallWishlistItem matches the created item:
 *     ids and foreign keys match, product and sku summaries refer to the same
 *     entities, and the DTO passes typia.assert.
 */
export async function test_api_wishlist_item_detail_basic_retrieval(
  connection: api.IConnection,
) {
  // 1. Register customer (auto-authenticated)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "Password123!",
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 2. Register seller (auto-authenticated as seller)
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Password123!",
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Register admin (auto-authenticated as admin)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "Password123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. As seller, ensure seller session (login again for clarity)
  const sellerLoginBody = {
    email: sellerEmail,
    password: "Password123!",
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 5. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: "AutoBE Test Brand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. As admin, ensure admin session (login again)
  const adminLoginBody = {
    email: adminEmail,
    password: "Password123!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 7. Admin creates a skuInventoryState
  const inventoryStateCreateBody = {
    code: "in_stock_" + RandomGenerator.alphaNumeric(8),
    name: "In Stock " + RandomGenerator.alphabets(5),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert(inventoryState);

  // 8. As seller again, login and create SKU under the product
  const sellerLoggedInAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedInAgain);

  const skuCreateBody = {
    code: "SKU-" + RandomGenerator.alphaNumeric(10),
    barcode: "BAR" + RandomGenerator.alphaNumeric(10),
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [
      {
        system_code: "WMS",
        external_id: "EXT-" + RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallSkuExternalId.ICreate,
    ],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 9. As customer, ensure customer session (login again)
  const customerLoginBody = {
    email: customerEmail,
    password: "Password123!",
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 10. Customer creates a wishlist
  const wishlistCreateBody = {
    name: "My Test Wishlist",
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(wishlist);

  // 11. Customer creates a wishlist item pointing to the product and SKU
  const wishlistItemCreateBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
    position: 1,
  } satisfies IShoppingMallWishlistItem.ICreate;
  const createdWishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemCreateBody,
      },
    );
  typia.assert(createdWishlistItem);

  // 12. Retrieve the wishlist item detail
  const fetchedWishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.at(connection, {
      wishlistId: wishlist.id,
      wishlistItemId: createdWishlistItem.id,
    });
  typia.assert(fetchedWishlistItem);

  // 13. Assert basic identity and foreign key consistency
  TestValidator.equals(
    "wishlist item id should match path id",
    fetchedWishlistItem.id,
    createdWishlistItem.id,
  );
  TestValidator.equals(
    "wishlist id should match path wishlistId",
    fetchedWishlistItem.shopping_mall_wishlist_id,
    wishlist.id,
  );
  TestValidator.equals(
    "product id on wishlist item should match created product id",
    fetchedWishlistItem.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "sku id on wishlist item should match created sku id",
    fetchedWishlistItem.shopping_mall_sku_id,
    sku.id,
  );

  // 14. Assert product summary consistency when present
  if (fetchedWishlistItem.product !== undefined) {
    TestValidator.equals(
      "product summary id should match wishlist item product id",
      fetchedWishlistItem.product.id,
      fetchedWishlistItem.shopping_mall_product_id,
    );
  }

  // 15. Assert SKU summary consistency when present
  if (
    fetchedWishlistItem.sku !== undefined &&
    fetchedWishlistItem.sku !== null
  ) {
    TestValidator.equals(
      "sku summary id should match wishlist item sku id",
      fetchedWishlistItem.sku.id,
      fetchedWishlistItem.shopping_mall_sku_id,
    );
  }
}
