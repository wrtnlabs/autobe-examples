import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
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
 * Validate access control for wishlist item search by wishlist owner.
 *
 * This test ensures that wishlist item search (PATCH
 * /shoppingMall/customer/wishlists/{wishlistId}/items) is only accessible to
 * the owning customer, and that another customer cannot query items from
 * someone else’s wishlist. It also validates that the owner can successfully
 * search and retrieve their own items.
 *
 * End-to-end flow:
 *
 * 1. Register and auto-authenticate Customer A using /auth/customer/join.
 * 2. While authenticated as Customer A, create a wishlist via
 *    /shoppingMall/customer/wishlists and capture its id.
 * 3. Register and auto-authenticate a Seller via /auth/seller/join.
 * 4. While authenticated as the Seller, create a product via
 *    /shoppingMall/seller/products.
 * 5. Register and auto-authenticate an Admin via /auth/admin/join.
 * 6. While authenticated as the Admin, create a SKU inventory state via
 *    /shoppingMall/admin/skuInventoryStates.
 * 7. Switch back to Seller context using /auth/seller/login (with the same
 *    email/password) and create a SKU for the product using
 *    /shoppingMall/seller/products/{productId}/skus, referencing the inventory
 *    state id.
 * 8. Switch back to Customer A using /auth/customer/login (same email/password)
 *    and add a wishlist item to Customer A’s wishlist using
 *    /shoppingMall/customer/wishlists/{wishlistId}/items, referencing the
 *    product and SKU ids.
 * 9. Register and auto-authenticate Customer B using /auth/customer/join.
 * 10. While authenticated as Customer B, attempt to search items in Customer A’s
 *     wishlist using /shoppingMall/customer/wishlists/{wishlistId}/items
 *     (index/patch) with a minimal valid IShoppingMallWishlistItem.IRequest
 *     body (e.g., page=1, limit=10, sort="created_at_desc", productId & skuId
 *     filters). Expect the call to fail due to access control, and assert this
 *     with TestValidator.error, without checking concrete HTTP status codes.
 * 11. Switch back to Customer A via /auth/customer/login and perform the same
 *     search request on the wishlist. Expect success, assert the
 *     IPageIShoppingMallWishlistItem.ISummary response via typia.assert, and
 *     verify that at least one returned item matches the wishlist item id
 *     created in step 8.
 */
export async function test_api_wishlist_items_search_access_control_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate Customer A
  const customerAEmail: string = typia.random<string & tags.Format<"email">>();
  const customerAPassword: string = RandomGenerator.alphaNumeric(12);
  const customerAJoinHref: string = "https://customer-a.example.com/join";
  const customerAJoinReferrer: string =
    "https://customer-a.example.com/landing";

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerAEmail,
        password: customerAPassword,
        ip: null,
        href: customerAJoinHref,
        referrer: customerAJoinReferrer,
      } satisfies IShoppingMallCustomerJoin.IRequest,
    });
  typia.assert(customerA);

  // 2. Create wishlist for Customer A
  const wishlistA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: "Customer A Wishlist",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        is_default: true,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(wishlistA);

  // 3. Register and authenticate a Seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);
  const sellerJoinHref: string = "https://seller.example.com/join";
  const sellerJoinReferrer: string = "https://seller.example.com/landing";

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: sellerJoinHref,
        referrer: sellerJoinReferrer,
      } satisfies IShoppingMallSellerAuthJoin.IRequest,
    });
  typia.assert(seller);

  // 4. Create product as Seller
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: "TestBrand",
        model_name: "Model-" + RandomGenerator.alphaNumeric(4),
        status: "active",
        primary_image_uri: "https://cdn.example.com/product.jpg",
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 5. Register and authenticate an Admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminJoinHref: string = "https://admin.example.com/join";
  const adminJoinReferrer: string = "https://admin.example.com/landing";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: adminJoinHref,
        referrer: adminJoinReferrer,
      } satisfies IShoppingMallAdminJoin.ICreate,
    });
  typia.assert(admin);

  // 6. Create SKU inventory state as Admin
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: "in_stock_" + RandomGenerator.alphaNumeric(6),
          name: "In Stock",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert(inventoryState);

  // 7. Switch back to Seller via login and create SKU
  const sellerLoginHref: string = "https://seller.example.com/login";
  const sellerLoginReferrer: string = "https://seller.example.com/home";

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: sellerLoginHref,
        referrer: sellerLoginReferrer,
      } satisfies IShoppingMallSellerAuthLogin.IRequest,
    });
  typia.assert(sellerLoggedIn);

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        code: "SKU-" + RandomGenerator.alphaNumeric(6),
        barcode: null,
        status: "active",
        price: 199.99,
        original_price: 249.99,
        inventory_quantity: 10,
        low_stock_threshold: 2,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  // 8. Switch back to Customer A via login and add wishlist item
  const customerALoginHref: string = "https://customer-a.example.com/login";
  const customerALoginReferrer: string = "https://customer-a.example.com/home";

  const customerALoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerAEmail,
        password: customerAPassword,
        ip: null,
        href: customerALoginHref,
        referrer: customerALoginReferrer,
      } satisfies IShoppingMallCustomerLogin.IRequest,
    });
  typia.assert(customerALoggedIn);

  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlistA.id,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_sku_id: sku.id,
          position: null,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);

  // 9. Register and authenticate Customer B
  const customerBEmail: string = typia.random<string & tags.Format<"email">>();
  const customerBPassword: string = RandomGenerator.alphaNumeric(12);
  const customerBJoinHref: string = "https://customer-b.example.com/join";
  const customerBJoinReferrer: string =
    "https://customer-b.example.com/landing";

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerBEmail,
        password: customerBPassword,
        ip: null,
        href: customerBJoinHref,
        referrer: customerBJoinReferrer,
      } satisfies IShoppingMallCustomerJoin.IRequest,
    });
  typia.assert(customerB);

  // 10. As Customer B, attempt to search items in Customer A’s wishlist (expect failure)
  const forbiddenRequestBody = {
    page: 1,
    limit: 10,
    sort: "created_at_desc" as const,
    productId: product.id,
    skuId: sku.id,
    createdFrom: null,
    createdTo: null,
  } satisfies IShoppingMallWishlistItem.IRequest;

  await TestValidator.error(
    "customer B cannot search another customer's wishlist items",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.index(
        connection,
        {
          wishlistId: wishlistA.id,
          body: forbiddenRequestBody,
        },
      );
    },
  );

  // 11. Switch back to Customer A and perform the same search (expect success)
  const customerALoginHref2: string = "https://customer-a.example.com/login2";
  const customerALoginReferrer2: string =
    "https://customer-a.example.com/after-b";

  const customerALoggedInAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerAEmail,
        password: customerAPassword,
        ip: null,
        href: customerALoginHref2,
        referrer: customerALoginReferrer2,
      } satisfies IShoppingMallCustomerLogin.IRequest,
    });
  typia.assert(customerALoggedInAgain);

  const allowedRequestBody = {
    page: 1,
    limit: 10,
    sort: "created_at_desc" as const,
    productId: product.id,
    skuId: sku.id,
    createdFrom: null,
    createdTo: null,
  } satisfies IShoppingMallWishlistItem.IRequest;

  const pageResult: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlistA.id,
        body: allowedRequestBody,
      },
    );
  typia.assert(pageResult);

  const foundItem = pageResult.data.find((item) => item.id === wishlistItem.id);

  TestValidator.predicate(
    "owner search returns the wishlist item that was created",
    foundItem !== undefined,
  );
}
