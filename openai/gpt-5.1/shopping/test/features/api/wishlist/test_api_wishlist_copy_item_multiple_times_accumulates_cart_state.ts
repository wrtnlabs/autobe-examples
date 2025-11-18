import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
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

/**
 * End-to-end test for copying a wishlist item into the cart multiple times to
 * validate cart line accumulation and merge behavior semantics.
 *
 * Business scenario:
 *
 * - A customer saves a product SKU into a wishlist.
 * - The customer copies that wishlist item into their cart multiple times with
 *   different merge behaviors ("increase" and "replace").
 * - The system must reuse the same cart and the same cart item line, while
 *   adjusting the quantity according to the merge behavior and default behavior
 *   when merge_behavior is omitted.
 *
 * Steps:
 *
 * 1. Admin joins and immediately configures a purchasable inventory state and a
 *    category while the admin token is active.
 * 2. Seller joins and, while the seller token is active, creates a product and SKU
 *    bound to that inventory state.
 * 3. Customer joins and, as the active customer actor, creates a wishlist, a
 *    wishlist item for that product/SKU, and a cart header.
 * 4. Customer calls copyItemToCart four times with different quantities and merge
 *    behaviors and we assert that:
 *
 *    - The cart id remains the same across calls,
 *    - The cart item id remains the same (no duplicate lines),
 *    - Quantities change as: 1 -> 3 (increase) -> 5 (replace) -> 7 (default),
 *    - Wishlist and messages fields remain in a healthy state.
 */
export async function test_api_wishlist_copy_item_multiple_times_accumulates_cart_state(
  connection: api.IConnection,
) {
  // 1. Admin join (also logs in and sets Authorization header via SDK).
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
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

  // 2. As admin, create SKU inventory state (purchasable) and category
  //    while admin token is active.
  const skuInventoryStateBody = {
    code: `purchasable-${RandomGenerator.alphaNumeric(8)}`,
    name: "Purchasable",
    description: "Purchasable state for E2E tests",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(skuInventoryState);

  const categoryBody = {
    parent_id: null,
    slug: `category-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "E2E Category",
    description_en: "Category for wishlist/cart copy tests",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Seller join (authenticated as seller afterwards).
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
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

  // 4. As seller, create product and SKU while seller token is active.
  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // Associate product with category (admin endpoint) – switch back to admin.
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/dashboard" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

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

  // Switch back to seller to create SKU.
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/dashboard" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginResult);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: 120 as number & tags.Minimum<0>,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 5. Customer join (authenticated as customer afterwards).
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 6. As customer, create wishlist, wishlist item, and cart.
  const wishlistBody = {
    name: "My Wishlist",
    description: "Wishlist for copy-to-cart test",
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert(wishlist);

  const wishlistItemBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
    position: null,
  } satisfies IShoppingMallWishlistItem.ICreate;
  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemBody,
      },
    );
  typia.assert(wishlistItem);

  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 7. First copy: desired_quantity=1, merge_behavior="increase".
  const firstCopyBody = {
    wishlist_item_id: wishlistItem.id,
    desired_quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    merge_behavior: "increase" as string & tags.MinLength<1>,
    client_context: "first-copy",
  } satisfies IShoppingMallWishlist.ICopyItemToCartRequest;
  const firstCopyResult: IShoppingMallWishlist.ICopyItemToCartResult =
    await api.functional.shoppingMall.customer.wishlists.copyItemToCart(
      connection,
      {
        wishlistId: wishlist.id,
        body: firstCopyBody,
      },
    );
  typia.assert(firstCopyResult);

  const firstWishlistView = firstCopyResult.wishlist;
  const firstCartView = firstCopyResult.cart;
  const firstCartItem = firstCartView.item;

  TestValidator.equals(
    "wishlist id matches on first copy",
    firstWishlistView.wishlist_id,
    wishlist.id,
  );
  TestValidator.equals(
    "wishlist item id matches on first copy",
    firstWishlistView.item_id,
    wishlistItem.id,
  );
  TestValidator.predicate(
    "wishlist item is copyable after first copy",
    firstWishlistView.item_copyable,
  );
  TestValidator.predicate(
    "messages defined or empty on first copy",
    firstCopyResult.messages === undefined ||
      Array.isArray(firstCopyResult.messages),
  );
  TestValidator.predicate(
    "cart id defined on first copy",
    firstCartView.cart_id.length > 0,
  );
  TestValidator.equals(
    "cart currency matches created cart on first copy",
    firstCartView.currency_code,
    cart.currency_code,
  );
  TestValidator.equals(
    "first cart item quantity is 1",
    firstCartItem.quantity,
    1,
  );

  const cartId = firstCartView.cart_id;
  const cartItemId = firstCartItem.cart_item_id;

  // 8. Second copy: desired_quantity=2, merge_behavior="increase" (expect 3).
  const secondCopyBody = {
    wishlist_item_id: wishlistItem.id,
    desired_quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    merge_behavior: "increase" as string & tags.MinLength<1>,
    client_context: "second-copy-increase",
  } satisfies IShoppingMallWishlist.ICopyItemToCartRequest;
  const secondCopyResult: IShoppingMallWishlist.ICopyItemToCartResult =
    await api.functional.shoppingMall.customer.wishlists.copyItemToCart(
      connection,
      {
        wishlistId: wishlist.id,
        body: secondCopyBody,
      },
    );
  typia.assert(secondCopyResult);

  const secondCartView = secondCopyResult.cart;
  const secondCartItem = secondCartView.item;

  TestValidator.equals(
    "cart id reused on second copy",
    secondCartView.cart_id,
    cartId,
  );
  TestValidator.equals(
    "cart item id reused on second copy",
    secondCartItem.cart_item_id,
    cartItemId,
  );
  TestValidator.equals(
    "cart item quantity increased to 3 on second copy",
    secondCartItem.quantity,
    3,
  );
  TestValidator.predicate(
    "wishlist item remains copyable after second copy",
    secondCopyResult.wishlist.item_copyable,
  );

  // 9. Third copy: desired_quantity=5, merge_behavior="replace" (expect 5).
  const thirdCopyBody = {
    wishlist_item_id: wishlistItem.id,
    desired_quantity: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    merge_behavior: "replace" as string & tags.MinLength<1>,
    client_context: "third-copy-replace",
  } satisfies IShoppingMallWishlist.ICopyItemToCartRequest;
  const thirdCopyResult: IShoppingMallWishlist.ICopyItemToCartResult =
    await api.functional.shoppingMall.customer.wishlists.copyItemToCart(
      connection,
      {
        wishlistId: wishlist.id,
        body: thirdCopyBody,
      },
    );
  typia.assert(thirdCopyResult);

  const thirdCartView = thirdCopyResult.cart;
  const thirdCartItem = thirdCartView.item;

  TestValidator.equals(
    "cart id reused on third copy",
    thirdCartView.cart_id,
    cartId,
  );
  TestValidator.equals(
    "cart item id reused on third copy",
    thirdCartItem.cart_item_id,
    cartItemId,
  );
  TestValidator.equals(
    "cart item quantity replaced to 5 on third copy",
    thirdCartItem.quantity,
    5,
  );

  // 10. Fourth copy: desired_quantity=2, merge_behavior omitted.
  //     Scenario assumes default behaves like "increase": expect 7.
  const fourthCopyBody = {
    wishlist_item_id: wishlistItem.id,
    desired_quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    client_context: "fourth-copy-default",
  } satisfies IShoppingMallWishlist.ICopyItemToCartRequest;
  const fourthCopyResult: IShoppingMallWishlist.ICopyItemToCartResult =
    await api.functional.shoppingMall.customer.wishlists.copyItemToCart(
      connection,
      {
        wishlistId: wishlist.id,
        body: fourthCopyBody,
      },
    );
  typia.assert(fourthCopyResult);

  const fourthCartView = fourthCopyResult.cart;
  const fourthCartItem = fourthCartView.item;

  TestValidator.equals(
    "cart id reused on fourth copy (default merge)",
    fourthCartView.cart_id,
    cartId,
  );
  TestValidator.equals(
    "cart item id reused on fourth copy (default merge)",
    fourthCartItem.cart_item_id,
    cartItemId,
  );
  TestValidator.equals(
    "cart item quantity adjusted to 7 on fourth copy (default merge)",
    fourthCartItem.quantity,
    7,
  );
}
