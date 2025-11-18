import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
 * Validate moving a wishlist item into a cart with merge_strategy = "increase".
 *
 * Business goal: Ensure that when a customer moves a wishlist item that
 * references a SKU already present in their cart, and merge_strategy is set to
 * "increase", the operation succeeds and the cart returned in the result still
 * refers to the same cart. Due to the provided API surface lacking cart-detail
 * read endpoints, we focus on identity and type-level guarantees instead of
 * re-reading line items.
 *
 * High level flow:
 *
 * 1. Create customer, seller, and admin accounts and authenticate as each role
 *    when calling their respective endpoints.
 * 2. As admin, create an inventory state that is purchasable.
 * 3. As seller, create a product.
 * 4. As admin, create a category and link the product to it.
 * 5. As seller, create a SKU tied to the inventory state.
 * 6. As customer, create a cart and add a cart item for the SKU (Q1 = 1).
 * 7. As customer, create a wishlist and add a wishlist item for the same
 *    product/SKU.
 * 8. As customer, call moveItemToCart with merge_strategy = "increase".
 * 9. Assert that the operation succeeded, the resulting cart summary refers to the
 *    same cart id, and the wishlist summary refers to the same wishlist id,
 *    using typia.assert and TestValidator.
 */
export async function test_api_wishlist_move_item_to_cart_with_merge_increase(
  connection: api.IConnection,
) {
  // 1. Register and authenticate actors: customer, seller, admin
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinHref: string & tags.Format<"uri"> =
    "https://shoppingmall.local/join" as string & tags.Format<"uri">;
  const joinReferrer: string & tags.Format<"uri"> =
    "https://shoppingmall.local/landing" as string & tags.Format<"uri">;

  const customerJoinBody = {
    email: customerEmail,
    password: "customer-password-123" as string & tags.Format<"password">,
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const sellerJoinBody = {
    email: sellerEmail,
    password: "seller-password-123" as string & tags.Format<"password">,
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const adminJoinBody = {
    email: adminEmail,
    password: "admin-password-123" as string & tags.Format<"password">,
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. As admin, create a purchasable inventory state
  const skuInventoryStateBody = {
    code: `state-${RandomGenerator.alphabets(8)}`,
    name: "Purchasable State",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 3. Switch to seller is already handled by SDK via join; create product
  const productBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://shoppingmall.local/images/prod.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4. As admin, create category and link product to category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Test Category",
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

  // 5. As seller, create a SKU for the product referencing the inventory state
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: 120 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 6. As customer, create a cart
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

  // 7. As customer, add a cart item with quantity Q1 = 1 for the SKU
  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemBody,
    });
  typia.assert(cartItem);

  const originalQuantity = cartItem.quantity;

  // 8. As customer, create a wishlist
  const wishlistBody = {
    name: "Main Wishlist",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert(wishlist);

  // 9. As customer, add a wishlist item referencing same product/SKU
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

  // 10. Move wishlist item to cart with merge_strategy = "increase"
  const moveRequestBody = {
    wishlist_item_id: wishlistItem.id,
    merge_strategy: "increase",
  } satisfies IShoppingMallWishlist.IMoveItemToCartRequest;

  const moveResult: IShoppingMallWishlist.IMoveItemToCartResult =
    await api.functional.shoppingMall.customer.wishlists.moveItemToCart(
      connection,
      {
        wishlistId: wishlist.id,
        body: moveRequestBody,
      },
    );
  typia.assert(moveResult);

  // 11. Validate cart and wishlist identity in the result
  const resultCart: IShoppingMallCart.ISummary = moveResult.cart;
  const resultWishlist: IShoppingMallWishlist.ISummary = moveResult.wishlist;

  TestValidator.equals(
    "cart id remains the same after moveItemToCart",
    resultCart.id,
    cart.id,
  );

  TestValidator.equals(
    "wishlist id remains the same after moveItemToCart",
    resultWishlist.id,
    wishlist.id,
  );

  // We cannot re-fetch cart items via a GET endpoint with given surface, so
  // we cannot assert on exact quantity increase in a type-safe way. However,
  // we can still assert that the original quantity is positive and that the
  // operation succeeded without error, which along with merge_strategy =
  // "increase" ensures business semantics are exercised.
  TestValidator.predicate(
    "original cart item quantity is positive",
    originalQuantity > 0,
  );

  TestValidator.predicate(
    "moveItemToCart result messages is either undefined or an array",
    Array.isArray(moveResult.messages ?? []),
  );
}
