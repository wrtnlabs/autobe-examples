import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate decreasing quantity of a guest cart item.
 *
 * Business flow:
 *
 * 1. Register and login a platform admin to create a brand.
 * 2. Register and login a seller to create a product linked to that brand and a
 *    SKU under the product.
 * 3. Create a guest cart for an anonymous visitor.
 * 4. Add a guest cart item pointing to the created SKU with an initial quantity
 *    greater than 1.
 * 5. Capture the original quantity and updated_at of the item.
 * 6. Call PUT /shoppingMall/guestCarts/{guestCartId}/items/{guestCartItemId} to
 *    reduce quantity to a lower positive integer.
 * 7. Assert the response quantity reflects the new lower value, guest_cart_id and
 *    product_sku_id are preserved, and updated_at is later than before.
 */
export async function test_api_guest_cart_item_quantity_update_to_lower_value(
  connection: api.IConnection,
) {
  // 1. Platform admin join
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin login (ensures token attached, though join already did)
  const platformAdminLoginBody = {
    email: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 3. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shoppingmall.test/logo/" + RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Seller join
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 5. Seller login (to ensure latest token context)
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 6. Create product under the seller using the created brand
  const productCode = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.test/product/" +
      RandomGenerator.alphaNumeric(16),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 7. Create a SKU under that product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.name(2),
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 8. Create a guest cart (unauthenticated context is fine; API is public)
  const guestToken = RandomGenerator.alphaNumeric(24);
  const guestCartCreateBody = {
    guest_token: guestToken,
    ip: "203.0.113.10",
    user_agent: "Mozilla/5.0 (E2E Test Guest Cart)",
    referrer: "https://shop.shoppingmall.test/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  // Basic structural check for items collection
  TestValidator.predicate(
    "guest cart items collection should be an array",
    Array.isArray(guestCart.items),
  );

  // 9. Add a guest cart item with initial quantity > 1
  const initialQuantity: number & tags.Type<"int32"> & tags.Minimum<1> =
    5 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const guestCartItemCreateBody = {
    sku_id: sku.id,
    quantity: initialQuantity,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const createdItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: guestCartItemCreateBody,
    });
  typia.assert(createdItem);

  TestValidator.equals(
    "created item should have expected initial quantity",
    createdItem.quantity,
    initialQuantity,
  );
  TestValidator.equals(
    "created item should point to correct guest cart",
    createdItem.guest_cart_id,
    guestCart.id,
  );
  TestValidator.equals(
    "created item should point to correct product sku",
    createdItem.product_sku_id,
    sku.id,
  );

  const originalUpdatedAt = createdItem.updated_at;

  // 10. Update the guest cart item to a lower, but valid, quantity
  const decreasedQuantity: number & tags.Type<"int32"> & tags.Minimum<1> =
    2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const guestCartItemUpdateBody = {
    quantity: decreasedQuantity,
  } satisfies IShoppingMallGuestCartItem.IUpdate;

  const updatedItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.update(connection, {
      guestCartId: guestCart.id,
      guestCartItemId: createdItem.id,
      body: guestCartItemUpdateBody,
    });
  typia.assert(updatedItem);

  // 11. Assert quantity decreased and identifiers preserved
  TestValidator.equals(
    "updated item should reflect decreased quantity",
    updatedItem.quantity,
    decreasedQuantity,
  );
  TestValidator.equals(
    "updated item should keep same guest_cart_id",
    updatedItem.guest_cart_id,
    createdItem.guest_cart_id,
  );
  TestValidator.equals(
    "updated item should keep same product_sku_id",
    updatedItem.product_sku_id,
    createdItem.product_sku_id,
  );

  // 12. Assert updated_at is later than before
  const originalTime = new Date(originalUpdatedAt).getTime();
  const updatedTime = new Date(updatedItem.updated_at).getTime();

  TestValidator.predicate(
    "updated_at must be later than original updated_at after decreasing quantity",
    updatedTime > originalTime,
  );
}
