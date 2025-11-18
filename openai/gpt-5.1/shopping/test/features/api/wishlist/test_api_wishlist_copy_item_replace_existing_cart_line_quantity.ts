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

export async function test_api_wishlist_copy_item_replace_existing_cart_line_quantity(
  connection: api.IConnection,
) {
  // 1. Admin join (and implicitly authenticate admin)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassword123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a purchasable inventory state as admin
  const inventoryStateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert(inventoryState);

  // 3. Seller join (authenticate seller)
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassword123!",
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 4. As seller, create a product
  const productBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(10) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5. As admin, create a category
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 6. As admin, attach the product to the category
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

  // 7. As seller, create a SKU under the product
  const skuBody = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: RandomGenerator.alphaNumeric(13),
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 100,
    low_stock_threshold: 5,
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

  // 8. Customer join (authenticate customer)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassword123!",
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 9. As customer, create an active wishlist
  const wishlistBody = {
    name: "Test Wishlist",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert(wishlist);

  // 10. As customer, add a wishlist item referencing product+SKU
  const wishlistItemBody = {
    shopping_mall_product_id: product.id,
    shopping_mall_sku_id: sku.id,
    position: 0,
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

  // 11. As customer, create a cart
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

  // 12. Pre-populate cart with line for same SKU (quantity=5)
  const initialCartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 5,
  } satisfies IShoppingMallCartItem.ICreate;
  const initialCartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: initialCartItemBody,
    });
  typia.assert(initialCartItem);

  const originalCartItemId: string = initialCartItem.id;
  const originalQuantity: number = initialCartItem.quantity;
  const originalUnitPrice: number = initialCartItem.unit_price;
  const originalCurrency: string = initialCartItem.currency_code;

  // 13. Call copyItemToCart with merge_behavior="replace" and desired_quantity=2
  const desiredQuantity: number & tags.Type<"int32"> & tags.Minimum<1> =
    2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const copyRequestBody = {
    wishlist_item_id: wishlistItem.id,
    desired_quantity: desiredQuantity,
    merge_behavior: "replace",
    client_context: "e2e-test-replace-merge",
  } satisfies IShoppingMallWishlist.ICopyItemToCartRequest;

  const copyResult: IShoppingMallWishlist.ICopyItemToCartResult =
    await api.functional.shoppingMall.customer.wishlists.copyItemToCart(
      connection,
      {
        wishlistId: wishlist.id,
        body: copyRequestBody,
      },
    );
  typia.assert(copyResult);

  // 14. Assertions on result: cart, item, and wishlist
  const wishlistView = copyResult.wishlist;
  const cartView = copyResult.cart;
  const cartItemView = cartView.item;

  // Basic type assertions
  typia.assert<IShoppingMallWishlist.ICopyItemToCartResult.IWishlistView>(
    wishlistView,
  );
  typia.assert<IShoppingMallWishlist.ICopyItemToCartResult.ICartView>(cartView);
  typia.assert<IShoppingMallWishlist.ICopyItemToCartResult.ICartItemView>(
    cartItemView,
  );

  // The response cart.cart_id matches the existing cart id
  TestValidator.equals(
    "copy result cart_id matches existing cart id",
    cartView.cart_id,
    cart.id,
  );

  // The returned cart.item.cart_item_id is the same as original cart line id
  TestValidator.equals(
    "existing cart item is reused (not new line)",
    cartItemView.cart_item_id,
    originalCartItemId,
  );

  // The quantity is exactly desiredQuantity (not original + desired)
  TestValidator.equals(
    "cart item quantity replaced by desired quantity",
    cartItemView.quantity,
    desiredQuantity,
  );

  // unit_price and currency_code remain unchanged
  TestValidator.equals(
    "cart item unit_price remains same as original",
    cartItemView.unit_price,
    originalUnitPrice,
  );
  TestValidator.equals(
    "cart item currency_code remains same as original",
    cartItemView.currency_code,
    originalCurrency,
  );

  // Wishlist retains the item and remains copyable
  TestValidator.equals(
    "wishlist view item_id equals original wishlist item id",
    wishlistView.item_id,
    wishlistItem.id,
  );
  TestValidator.predicate(
    "wishlist item remains copyable after copyItemToCart",
    wishlistView.item_copyable === true,
  );

  // Extended assertion: ensure the SKU id remained consistent
  TestValidator.equals(
    "cart item sku id remains consistent with wishlist SKU",
    cartItemView.sku_id,
    (wishlistItem.shopping_mall_sku_id ?? sku.id) as string,
  );

  // Sanity check that original quantity was different, to prove it changed
  TestValidator.notEquals(
    "original cart quantity and replaced quantity differ",
    originalQuantity,
    cartItemView.quantity,
  );
}
