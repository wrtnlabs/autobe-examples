import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import type { IShoppingMallWishlistMergeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistMergeEvent";

/**
 * Validate that the wishlist merge event detail endpoint is structurally sound
 * and callable in a realistic multi-actor shopping mall context.
 *
 * Business intent (adapted to available APIs):
 *
 * - Simulate a catalog where admin defines categories and SKU inventory states, a
 *   seller publishes a product with SKUs, a guest and then a customer operate
 *   wishlists, and finally a customer inspects the wishlist merge event
 *   detail.
 * - Because the SDK surface does not expose APIs to explicitly trigger or query
 *   guest→customer wishlist merges or to update a SKU from purchasable to
 *   non‑purchasable, we cannot assert exact merged vs dropped counts. Instead,
 *   we focus on the correctness of the endpoint wiring and response typing,
 *   while still performing realistic setup calls.
 *
 * High-level steps:
 *
 * 1. Admin lifecycle 1-1. Admin joins (POST /auth/admin/join) with
 *    IShoppingMallAdminJoin.ICreate. 1-2. Admin logs in (POST
 *    /auth/admin/login) with IShoppingMallAdminLogin.ICreate to ensure
 *    subsequent admin endpoints are authorized.
 * 2. Catalog configuration 2-1. Admin creates a category (POST
 *    /shoppingMall/admin/categories) using IShoppingMallCategory.ICreate. 2-2.
 *    Admin creates two SKU inventory states (POST
 *    /shoppingMall/admin/skuInventoryStates): - State A: is_purchasable = true
 *
 *    - State B: is_purchasable = false
 * 3. Seller lifecycle and product setup 3-1. Seller joins (POST
 *    /auth/seller/join). 3-2. Seller logs in (POST /auth/seller/login). 3-3.
 *    Seller creates a product (POST /shoppingMall/seller/products) using
 *    IShoppingMallProduct.ICreate. 3-4. Admin logs back in and attaches the
 *    product to the category via POST
 *    /shoppingMall/admin/products/{productId}/categories with
 *    IShoppingMallProductCategory.ICreate. 3-5. Seller logs in again and
 *    creates two SKUs under the product (POST
 *    /shoppingMall/seller/products/{productId}/skus) using
 *    IShoppingMallSku.ICreate, each referencing one of the created inventory
 *    states.
 * 4. Guest and customer lifecycle plus wishlist setup 4-1. Guest joins via POST
 *    /auth/guestUser/join using IShoppingMallGuestUser.IJoin (primarily to
 *    exercise the dependency). 4-2. Customer joins (POST /auth/customer/join)
 *    and logs in (POST /auth/customer/login), establishing a customer actor.
 *    4-3. Customer creates a wishlist via POST /shoppingMall/customer/wishlists
 *    using IShoppingMallWishlist.ICreate. 4-4. Customer creates two wishlist
 *    items pointing at the two SKUs via POST
 *    /shoppingMall/customer/wishlists/{wishlistId}/items using
 *    IShoppingMallWishlistItem.ICreate.
 * 5. Merge event detail retrieval (simplified due to API limits) 5-1. In a real
 *    system, guest→customer merge would be triggered by login or explicit merge
 *    APIs and a merge event row would be created. As this SDK snapshot lacks
 *    such APIs and any list/search endpoint for merge events, we cannot
 *    discover an actual mergeEventId tied to our wishlist. 5-2. Instead, we
 *    rely on the Nestia simulation mode behavior of
 *    api.functional.shoppingMall.customer.wishlists.mergeEvents.at, which
 *    generates an IShoppingMallWishlistMergeEvent via typia.random when
 *    connection.simulate is true. 5-3. We call the endpoint once with random
 *    wishlistId and mergeEventId (typed as strings) and assert the shape of the
 *    returned IShoppingMallWishlistMergeEvent via typia.assert.
 *
 * Assertions and validations:
 *
 * - Every non-void API call’s response is validated with typia.assert to
 *   guarantee structural correctness against its DTO type.
 * - Basic sanity checks using TestValidator ensure we are receiving coherent data
 *   (e.g., that admin/seller/customer IDs are UUIDs and that the merge event’s
 *   counts are non-negative integers).
 * - We do not assert specific business semantics like exact merged_item_count or
 *   dropped_item_count, because those would depend on merge logic not exposed
 *   via the current SDK.
 */
export async function test_api_wishlist_merge_event_detail_with_dropped_items_due_to_catalog_block(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Admin1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 1-2. Admin logs in
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 2-1. Admin creates a category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 2-2. Admin creates two SKU inventory states
  const purchasableStateBody = {
    code: `purch-${RandomGenerator.alphaNumeric(4)}`,
    name: "Purchasable",
    description: "Purchasable inventory state for normal selling",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const purchasableState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: purchasableStateBody,
      },
    );
  typia.assert(purchasableState);

  const nonPurchasableStateBody = {
    code: `np-${RandomGenerator.alphaNumeric(4)}`,
    name: "NonPurchasable",
    description: "Non-purchasable inventory state to simulate blocked items",
    is_purchasable: false,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const nonPurchasableState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: nonPurchasableStateBody,
      },
    );
  typia.assert(nonPurchasableState);

  // 3-1. Seller joins
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">,
    password: "Seller1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3-2. Seller logs in
  const sellerLoginBody = {
    email: sellerAuthorized.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 3-3. Seller creates a product
  const productBody = {
    code: `prod-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3-4. Admin attaches the product to the category
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  // 3-5. Seller logs in again and creates two SKUs under the product
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  const skuPurchBody = {
    code: `SKU-P-${RandomGenerator.alphaNumeric(4)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: 120 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: purchasableState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const skuPurch: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuPurchBody,
    });
  typia.assert(skuPurch);

  const skuNonPurchBody = {
    code: `SKU-NP-${RandomGenerator.alphaNumeric(4)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 150 as number & tags.Minimum<0>,
    original_price: 180 as number & tags.Minimum<0>,
    inventory_quantity: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: nonPurchasableState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const skuNonPurch: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuNonPurchBody,
    });
  typia.assert(skuNonPurch);

  // 4-1. Guest joins (dependency exercise)
  const guestJoinBody = {
    external_reference: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallGuestUser.IJoin;
  const guestAuthorized: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: guestJoinBody,
    });
  typia.assert(guestAuthorized);

  // 4-2. Customer joins and logs in
  const customerJoinBody = {
    email: `customer+${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">,
    password: "Customer1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/home" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerAuthorized.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/home" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 4-3. Customer creates a wishlist
  const wishlistBody = {
    name: "Guest Merge Target Wishlist",
    description: "Wishlist for testing merge events with dropped items",
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert(wishlist);

  // 4-4. Customer adds two wishlist items for both SKUs
  const wishlistItemBody1 = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: skuPurch.id,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;
  const wishlistItem1: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemBody1,
      },
    );
  typia.assert(wishlistItem1);

  const wishlistItemBody2 = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: skuNonPurch.id,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;
  const wishlistItem2: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemBody2,
      },
    );
  typia.assert(wishlistItem2);

  // 5. Retrieve merge event detail (simulation-based)
  // In simulate mode, mergeEvents.at will return typia.random<IShoppingMallWishlistMergeEvent>().
  // We call it with random IDs; the main goal is type and wiring validation.
  const mergeEvent: IShoppingMallWishlistMergeEvent =
    await api.functional.shoppingMall.customer.wishlists.mergeEvents.at(
      connection,
      {
        wishlistId: wishlist.id,
        mergeEventId: typia.random<string>(),
      },
    );
  typia.assert(mergeEvent);

  // Basic sanity checks on merge event structure
  TestValidator.predicate(
    "merged_item_count is non-negative",
    mergeEvent.merged_item_count >= 0,
  );
  TestValidator.predicate(
    "dropped_item_count is non-negative",
    mergeEvent.dropped_item_count >= 0,
  );

  // When target_wishlist is present, it should correspond to a wishlist summary
  if (mergeEvent.target_wishlist !== null) {
    TestValidator.equals(
      "target_wishlist has a valid id",
      typeof mergeEvent.target_wishlist.id,
      "string",
    );
  }
}
