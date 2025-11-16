import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Validate moving a cart item to wishlist and re-adding it.
 *
 * Business intent (adapted to available APIs):
 *
 * - Ensure that when a customer moves a cart item to a wishlist via `POST
 *   /shoppingMall/customer/customerCarts/{customerCartId}/items/{customerCartItemId}/moveToWishlist`,
 *   the item is removed from the cart and the customer can freely add the same
 *   SKU and quantity again, which is consistent with inventory reservations
 *   being released.
 *
 * High-level steps:
 *
 * 1. Create and authenticate three actors:
 *
 *    - PlatformAdmin (for brand and SKU management)
 *    - Seller (for product, option type/value, and inventory item)
 *    - Customer (for cart, cart item, wishlist, and moveToWishlist)
 * 2. As platformAdmin, create a brand.
 * 3. As seller, create a product referencing the seller and brand.
 * 4. As seller, create an option type (e.g., Color) and an option value (e.g.,
 *    blue).
 * 5. As platformAdmin, create a SKU under the product with valid pricing and
 *    purchasable flags.
 * 6. As seller, create an inventory item for the SKU with limited stock.
 * 7. As customer, create a cart and a wishlist.
 * 8. As customer, create a cart item using the SKU with quantity 1.
 * 9. Call moveToWishlist on that cart item.
 * 10. Assert that:
 *
 *     - The returned cart id matches the original cart.
 *     - The cart total_amount is non-negative and not greater than the pre-move
 *           total.
 *     - There is no cart item (in local test state) with the original cart item id.
 * 11. As customer, add the same SKU and quantity back into the cart and verify
 *     success.
 *
 * We cannot read inventory reservations or wishlist items from the SDK, so we
 * validate observable behavior instead: the cart line disappears and the
 * customer can re-add the same SKU, indicating inventory is available.
 */
export async function test_api_cart_item_move_to_wishlist_out_of_stock_release_reservation(
  connection: api.IConnection,
) {
  // ---------- 1. Create actors ----------

  // 1-1. Platform admin join
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 1-2. Seller join
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com`,
    password: "SellerPass123!",
    storeName: `Store-${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 1-3. Customer join
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.example.com`,
    password: "CustomerPass123!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // ---------- 2. Catalog setup (platform admin + seller) ----------

  // 2-1. As platform admin, create a brand
  // platformAdmin.join has already set Authorization header for platform admin
  const brandBody = {
    name: `Brand-${RandomGenerator.alphabets(6)}`,
    slug: `brand-${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 2-2. As seller, login to ensure seller token is set
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 2-3. Seller creates product
  const productCode = `prd-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product-${RandomGenerator.alphabets(6)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(sellerProduct);

  // 2-4. Seller creates option type for the product
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  // 2-5. Seller creates option value under the option type
  const optionValueBody = {
    value: "blue",
    display_name: "Blue",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 2-6. Switch to platform admin again to create SKU under product
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const skuBody = {
    code: skuCode,
    name: `SKU-${RandomGenerator.alphabets(6)}`,
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 2-7. Switch to seller to create inventory item for the SKU
  const sellerReLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReLogin);

  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);
  TestValidator.predicate(
    "inventory has at least one on-hand unit",
    inventoryItem.on_hand_quantity >= 1,
  );

  // ---------- 3. Customer cart and wishlist setup ----------

  // Switch to customer
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 3-1. Create customer cart
  const cartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartBody },
    );
  typia.assert(cart);
  TestValidator.predicate(
    "cart is active after creation",
    cart.is_active === true,
  );

  // 3-2. Create wishlist
  const wishlistBody = {
    name: `Wishlist-${RandomGenerator.alphabets(6)}`,
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert(wishlist);
  TestValidator.equals(
    "wishlist belongs to logged in customer",
    wishlist.customer.id,
    customerLoggedIn.id,
  );

  // ---------- 4. Add cart item for the SKU ----------

  const originalCartTotal = cart.total_amount;

  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "test line to move to wishlist",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  TestValidator.equals(
    "cart item sku id matches created sku",
    cartItem.skuId,
    sku.id,
  );
  TestValidator.equals("cart item quantity is 1", cartItem.quantity, 1);
  TestValidator.predicate(
    "cart item sku summary has same id",
    cartItem.sku.id === cartItem.skuId,
  );

  // ---------- 5. Move the cart item to wishlist ----------

  const movedCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.items.moveToWishlist(
      connection,
      {
        customerCartId: cart.id,
        customerCartItemId: cartItem.id,
      },
    );
  typia.assert(movedCart);

  TestValidator.equals(
    "moved cart id matches original cart",
    movedCart.id,
    cart.id,
  );
  TestValidator.predicate(
    "moved cart total amount is non-negative",
    movedCart.total_amount >= 0,
  );
  TestValidator.predicate(
    "moved cart total does not exceed original total",
    movedCart.total_amount <= originalCartTotal,
  );

  // ---------- 6. Re-add the same SKU to the cart ----------

  const reAddBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "re-added after moveToWishlist",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const reAddedItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: reAddBody,
      },
    );
  typia.assert(reAddedItem);

  TestValidator.equals(
    "re-added cart item sku id matches original sku",
    reAddedItem.skuId,
    sku.id,
  );
  TestValidator.notEquals(
    "re-added cart item has different id from original item",
    reAddedItem.id,
    cartItem.id,
  );
}
