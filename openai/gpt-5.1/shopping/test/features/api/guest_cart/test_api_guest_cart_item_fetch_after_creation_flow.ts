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
 * Fetch a specific guest cart item after creation in a fully built catalog
 * context.
 *
 * Business flow:
 *
 * 1. Register a platform admin and obtain an authenticated platform admin session.
 * 2. As platform admin, create a brand to be referenced by catalog products.
 * 3. Register a seller account and obtain an authenticated seller session.
 * 4. As seller, create an active, multi-SKU product associated with the brand.
 * 5. As seller, create a purchasable SKU under that product.
 * 6. As a guest (no authentication required), create a guest cart with realistic
 *    metadata.
 * 7. Add a cart item to the guest cart referencing the created SKU and a valid
 *    quantity.
 * 8. Call GET /shoppingMall/guestCarts/{guestCartId}/items/{guestCartItemId} to
 *    fetch that item.
 * 9. Validate that the fetched item matches the created one in id, cart ownership,
 *    SKU/product relation, quantity, and timestamps.
 */
export async function test_api_guest_cart_item_fetch_after_creation_flow(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and get authorized session
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://console.example.com/admin/join",
    referrer: "https://console.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a brand under platform admin context
  const brandCreateBody = {
    name: RandomGenerator.name(),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: `https://${RandomGenerator.alphaNumeric(8)}.example.com/logo.png`,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register a seller and obtain seller-authenticated session
  const sellerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@seller.example.com`,
    password: "P@ssw0rd!",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 4. Create a product as the seller, associated with the created brand
  const productCode: string = RandomGenerator.alphaNumeric(16);
  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: `https://${RandomGenerator.alphaNumeric(8)}.img.example.com/product.png`,
    additional_data: "{}",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product seller id should match seller id",
    product.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "product brand id should match created brand id",
    product.brand?.id ?? null,
    brand.id,
  );

  // 5. Create a purchasable SKU for that product
  const skuCode: string = RandomGenerator.alphaNumeric(12);
  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.name(),
    listPrice: 10000,
    salePrice: 9000,
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

  TestValidator.equals(
    "sku product id should match product id",
    sku.product.id,
    product.id,
  );
  TestValidator.equals(
    "sku productCode should match product code",
    sku.productCode,
    product.code,
  );

  // 6. Create a guest cart (guest, no auth required)
  const guestToken: string = RandomGenerator.alphaNumeric(32);
  const guestCartCreateBody = {
    guest_token: guestToken,
    ip: "127.0.0.1",
    user_agent: "e2e-test/guest-cart-item-fetch",
    referrer: "https://shop.example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  TestValidator.equals(
    "guest cart token should match the input token",
    guestCart.guest_token,
    guestToken,
  );

  // 7. Add a guest cart item referencing the created SKU
  const quantity = 2;
  const guestCartItemCreateBody = {
    sku_id: sku.id,
    quantity,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const createdItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: guestCartItemCreateBody,
    });
  typia.assert(createdItem);

  TestValidator.equals(
    "created guest cart item should belong to the correct cart",
    createdItem.guest_cart_id,
    guestCart.id,
  );
  TestValidator.equals(
    "created guest cart item SKU id should match SKU id",
    createdItem.product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "created guest cart item quantity should match the requested quantity",
    createdItem.quantity,
    quantity,
  );

  // 8. Fetch the specific guest cart item via GET endpoint
  const fetchedItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.at(connection, {
      guestCartId: guestCart.id,
      guestCartItemId: createdItem.id,
    });
  typia.assert(fetchedItem);

  // 9. Validate that fetched item matches the created one
  TestValidator.equals(
    "fetched guest cart item id matches created id",
    fetchedItem.id,
    createdItem.id,
  );
  TestValidator.equals(
    "fetched guest cart id matches cart id",
    fetchedItem.guest_cart_id,
    guestCart.id,
  );
  TestValidator.equals(
    "fetched product id matches created item product id",
    fetchedItem.product_id,
    createdItem.product_id,
  );
  TestValidator.equals(
    "fetched product SKU id matches created item SKU id",
    fetchedItem.product_sku_id,
    createdItem.product_sku_id,
  );
  TestValidator.equals(
    "fetched quantity matches created item quantity",
    fetchedItem.quantity,
    createdItem.quantity,
  );

  TestValidator.predicate(
    "fetched created_at should be a non-empty string",
    fetchedItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "fetched updated_at should be a non-empty string",
    fetchedItem.updated_at.length > 0,
  );
}
