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

export async function test_api_wishlist_item_move_to_cart_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain an authorized session
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // 2. Create a customer cart for the authenticated customer
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "wishlist-move-to-cart-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const initialCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartCreateBody },
    );
  typia.assert(initialCart);

  // 3. Register and authenticate a seller (for seller-scoped product operations)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 4. Register and authenticate a platform admin (for catalog-level operations)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 5. As platform admin, create a category tree (even if not strictly required by product create, it reflects dependencies)
  const categoryTreeCreateBody = {
    code: `ct-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Category Tree",
    description: "Category tree for wishlist move-to-cart test",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  // 6. As platform admin, create a brand for the product
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: "Brand used in wishlist move-to-cart scenario",
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 7. As seller, create a base product owned by the seller
  const sellerProductCode = `seller-prod-${RandomGenerator.alphaNumeric(8)}`;
  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_brand_id: brand.id,
    code: sellerProductCode,
    name: "Wishlist MoveToCart Test Product",
    short_description: "A product used for wishlist moveToCart E2E test.",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-main.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  // 8. As seller, define an option type (e.g., SIZE) for the product
  const optionTypeCreateBody = {
    name: "SIZE",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 9. As seller, create an option value (e.g., size M) for the option type
  const optionValueCreateBody = {
    value: "M",
    display_name: "Medium",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 10. As platform admin, create a catalog product (using the same seller and brand) and a SKU under it
  const adminProductCode = `admin-prod-${RandomGenerator.alphaNumeric(8)}`;
  const adminProductCreateBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_brand_id: brand.id,
    code: adminProductCode,
    name: "Admin Catalog Product For Wishlist MoveToCart",
    short_description: "Admin-scoped product for wishlist moveToCart test.",
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/admin-product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const adminProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: adminProductCreateBody,
      },
    );
  typia.assert(adminProduct);

  const skuPrice = 49.99;
  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: "Wishlist MoveToCart SKU",
    listPrice: skuPrice,
    salePrice: skuPrice,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: adminProduct.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 11. Re-authenticate as the original customer to ensure we operate under customer context again
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAuthAfterLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuthAfterLogin);

  TestValidator.equals(
    "customer identity stable through join/login",
    customerAuthAfterLogin.id,
    customerAuth.id,
  );

  // 12. Create a wishlist for the customer
  const wishlistCreateBody = {
    name: "Wishlist for MoveToCart",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(wishlist);

  // 13. Create a wishlist item that references the created SKU
  const wishlistItemCreateBody = {
    shopping_mall_product_id: adminProduct.id,
    shopping_mall_product_sku_id: sku.id,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: wishlistItemCreateBody,
      },
    );
  typia.assert(wishlistItem);

  // 14. Move the wishlist item into the cart
  const cartAfterMove: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.wishlists.items.moveToCart(
      connection,
      {
        wishlistId: wishlist.id,
        wishlistItemId: wishlistItem.id,
      },
    );
  typia.assert(cartAfterMove);

  // 15. Validate ownership and monetary totals
  TestValidator.equals(
    "cart remains owned by the same customer after moveToCart",
    cartAfterMove.customer.id,
    customerAuth.id,
  );

  TestValidator.equals(
    "cart currency code remains consistent",
    cartAfterMove.currency_code,
    initialCart.currency_code,
  );

  TestValidator.equals(
    "cart subtotal equals single SKU price after moveToCart",
    cartAfterMove.subtotal_amount,
    skuPrice,
  );

  TestValidator.equals(
    "cart total equals subtotal + tax + shipping - discount",
    cartAfterMove.total_amount,
    cartAfterMove.subtotal_amount -
      cartAfterMove.discount_amount +
      cartAfterMove.tax_amount +
      cartAfterMove.shipping_amount,
  );

  TestValidator.predicate(
    "wishlist moveToCart produces a non-zero subtotal",
    cartAfterMove.subtotal_amount > 0,
  );
}
