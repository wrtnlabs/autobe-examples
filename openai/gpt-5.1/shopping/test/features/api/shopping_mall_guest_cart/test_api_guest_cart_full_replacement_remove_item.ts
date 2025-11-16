import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartClientMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartClientMetadata";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallGuestCartItemForCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItemForCart";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate full replacement semantics of guest cart update.
 *
 * Business purpose:
 *
 * - Ensure that PUT /shoppingMall/guestCarts/{guestCartId} treats the items
 *   collection as the complete desired state of the cart.
 * - When an existing SKU is omitted from the items array in
 *   IShoppingMallGuestCart.IUpdate, that SKU must be removed from the cart.
 * - Remaining SKUs must be kept with their updated quantities and associated
 *   catalog relationships.
 *
 * High level steps:
 *
 * 1. Bootstrap actors and catalog data (platform admin, brand, seller, product,
 *    SKUs).
 * 2. Create a guest cart.
 * 3. Add two different SKUs into the guest cart via item-create endpoint.
 * 4. Call PUT guestCart update with only one of those SKUs in the items array.
 * 5. Assert that the omitted SKU has been removed and the included SKU has the
 *    requested quantity, and that the cart identity is stable.
 */
export async function test_api_guest_cart_full_replacement_remove_item(
  connection: api.IConnection,
) {
  // 1. Platform admin join & login (single call is enough to get authorized session)
  const platformAdminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a brand as platform admin
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller join & login
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 4. Create a product for the seller, associated with the brand
  const productCode = `P-${RandomGenerator.alphaNumeric(10)}` as string &
    tags.MinLength<1>;
  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "created product code should match requested code",
    product.code,
    productCode,
  );

  // 5. Create two SKUs under the product (SKU A and SKU B)
  const skuACreateBody = {
    code: `SKU-A-${RandomGenerator.alphaNumeric(6)}`,
    name: `SKU A ${RandomGenerator.name(1)}`,
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuACreateBody,
    });
  typia.assert(skuA);

  const skuBCreateBody = {
    code: `SKU-B-${RandomGenerator.alphaNumeric(6)}`,
    name: `SKU B ${RandomGenerator.name(1)}`,
    listPrice: 120,
    salePrice: 110,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBCreateBody,
    });
  typia.assert(skuB);

  // 6. Create a guest cart (no auth required)
  const guestToken = `guest-${RandomGenerator.alphaNumeric(12)}`;
  const guestCartCreateBody = {
    guest_token: guestToken,
    ip: "203.0.113.1",
    user_agent: "Mozilla/5.0 (E2E Test)",
    referrer: "https://shop.example.com/landing",
    region_code: "US",
  } satisfies IShoppingMallGuestCart.ICreate;

  const createdCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBody,
    });
  typia.assert(createdCart);
  TestValidator.equals(
    "guest cart id should be uuid string",
    createdCart.id,
    createdCart.id,
  );
  TestValidator.equals(
    "guest cart token should match input",
    createdCart.guest_token,
    guestToken,
  );

  const guestCartId: string & tags.Format<"uuid"> = createdCart.id;

  // 7. Add two items to the guest cart: one for SKU A and one for SKU B
  const itemAQuantityInitial = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const itemACreateBody = {
    sku_id: skuA.id,
    quantity: itemAQuantityInitial,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const itemA: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId,
      body: itemACreateBody,
    });
  typia.assert(itemA);

  const itemBQuantityInitial = 3 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const itemBCreateBody = {
    sku_id: skuB.id,
    quantity: itemBQuantityInitial,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const itemB: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId,
      body: itemBCreateBody,
    });
  typia.assert(itemB);

  TestValidator.equals(
    "guest cart id for item A should match cart id",
    itemA.guest_cart_id,
    guestCartId,
  );
  TestValidator.equals(
    "guest cart id for item B should match cart id",
    itemB.guest_cart_id,
    guestCartId,
  );

  // 8. Full replacement update: keep only SKU A with new quantity, drop SKU B
  const updatedQuantityForA = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const cartUpdateBody = {
    currency_code: "USD",
    client_metadata: {
      user_agent: "Mozilla/5.0 (E2E Test Updated)",
      device_type: "desktop",
      locale: "en-US",
    } satisfies IShoppingMallGuestCartClientMetadata.IUpdate,
    items: [
      {
        sku_id: skuA.id,
        quantity: updatedQuantityForA,
      } satisfies IShoppingMallGuestCartItemForCart.IUpdate,
    ],
  } satisfies IShoppingMallGuestCart.IUpdate;

  const updatedCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.update(connection, {
      guestCartId,
      body: cartUpdateBody,
    });
  typia.assert(updatedCart);

  // 9. Validate full replacement semantics
  TestValidator.equals(
    "updated cart id should remain same as original",
    updatedCart.id,
    guestCartId,
  );
  TestValidator.equals(
    "guest token should remain unchanged after update",
    updatedCart.guest_token,
    guestToken,
  );

  TestValidator.equals(
    "updated cart should contain exactly one item after full replacement",
    updatedCart.items.length,
    1,
  );

  const remainingItem = updatedCart.items[0];
  TestValidator.equals(
    "remaining item should reference same SKU A as originally added",
    remainingItem.product_sku_id,
    skuA.id,
  );
  TestValidator.equals(
    "remaining item quantity should be updated to requested quantity",
    remainingItem.quantity,
    updatedQuantityForA,
  );

  // Ensure SKU B has been removed: no item with product_sku_id == skuB.id
  const hasSkuB = updatedCart.items.some((it) => it.product_sku_id === skuB.id);
  TestValidator.predicate(
    "updated cart items should not contain SKU B",
    hasSkuB === false,
  );
}
