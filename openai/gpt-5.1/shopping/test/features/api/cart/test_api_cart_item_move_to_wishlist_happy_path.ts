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
 * Happy-path scenario for moving a customer cart item into a wishlist.
 *
 * Business flow:
 *
 * 1. Register and authenticate a platform admin.
 * 2. With platform admin, create a category tree and a brand (used only to make
 *    the catalog setup realistic).
 * 3. Register and authenticate a seller.
 * 4. As seller, create a product associated with the seller and (optionally) the
 *    brand.
 * 5. As seller, create a product option type and a corresponding option value for
 *    the product (structural realism; SKUs don’t directly require it, but
 *    catalog typically does).
 * 6. As platform admin, create a SKU under the product using the productCode.
 * 7. Register and authenticate a customer (customer join implicitly logs in and
 *    sets Authorization header).
 * 8. As customer, create a persistent cart (customerCarts.create).
 * 9. As customer, add a cart item that references the created SKU
 *    (customerCarts.items.create).
 * 10. As customer, create a wishlist.
 * 11. As customer, call moveToWishlist on the specific cart item.
 * 12. Validate that the returned cart is structurally valid and still owned by the
 *     same customer, and that key totals remain non-negative.
 *
 * Due to lack of item listing APIs and wishlist item listing APIs in the
 * provided SDK, the test does not attempt to re-fetch cart items or wishlist
 * items to assert detailed quantity movement. Instead, it focuses on executing
 * the full workflow without error and validating strong typing and basic
 * invariants.
 */
export async function test_api_cart_item_move_to_wishlist_happy_path(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and becomes authenticated
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create category tree and brand as platform admin (catalog prerequisites)
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller joins and authenticates
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerP@ssw0rd!",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Seller creates a product
  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;

  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.example.com/products/sample-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  // 5. Seller creates product option type and value for realism
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 6. Platform admin creates a SKU for the product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;

  const skuCreateBody = {
    code: skuCode,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 7. Customer joins (also authenticates and sets token)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerP@ssw0rd!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 8. Customer creates a cart
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(customerCart);

  TestValidator.equals(
    "cart owner matches authenticated customer",
    customerCart.customer.id,
    customerAuthorized.id,
  );

  // 9. Customer adds a cart item referencing the SKU
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Move this to wishlist in test",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  TestValidator.equals(
    "cart item is attached to expected cart",
    cartItem.customerCartId,
    customerCart.id,
  );

  // 10. Customer creates a wishlist
  const wishlistCreateBody = {
    name: "My test wishlist",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(wishlist);

  TestValidator.equals(
    "wishlist owner matches authenticated customer",
    wishlist.customer.id,
    customerAuthorized.id,
  );

  // 11. Move the cart item to wishlist
  const movedCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.items.moveToWishlist(
      connection,
      {
        customerCartId: customerCart.id,
        customerCartItemId: cartItem.id,
      },
    );
  typia.assert(movedCart);

  // 12. Basic invariants on moved cart
  TestValidator.equals(
    "moved cart id stays the same",
    movedCart.id,
    customerCart.id,
  );
  TestValidator.equals(
    "moved cart owner stays the same",
    movedCart.customer.id,
    customerCart.customer.id,
  );

  TestValidator.predicate(
    "subtotal is non-negative",
    movedCart.subtotal_amount >= 0,
  );
  TestValidator.predicate(
    "discount is non-negative",
    movedCart.discount_amount >= 0,
  );
  TestValidator.predicate("tax is non-negative", movedCart.tax_amount >= 0);
  TestValidator.predicate(
    "shipping is non-negative",
    movedCart.shipping_amount >= 0,
  );
  TestValidator.predicate("total is non-negative", movedCart.total_amount >= 0);
}
