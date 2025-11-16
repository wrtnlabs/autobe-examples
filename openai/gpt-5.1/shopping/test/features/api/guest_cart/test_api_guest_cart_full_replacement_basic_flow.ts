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

export async function test_api_guest_cart_full_replacement_basic_flow(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin login (switch context explicitly)
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  TestValidator.equals(
    "platform admin email should match join payload",
    platformAdminLogin.email,
    platformAdminJoinBody.email,
  );

  // 3. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  TestValidator.equals(
    "created brand name should match request body",
    brand.name,
    brandCreateBody.name,
  );

  // 4. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 5. Seller login to ensure session context is stable
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  TestValidator.equals(
    "seller email should match join payload",
    sellerLogin.email,
    sellerJoinBody.email,
  );

  // 6. Seller creates a product associated with the created brand
  const productCode = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(8),
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "created product code should match request body",
    product.code,
    productCreateBody.code,
  );

  // 7. Seller creates a purchasable SKU under the product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const productSkuCreateBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: productSkuCreateBody,
    });
  typia.assert(sku);

  TestValidator.equals(
    "created SKU code should match request body",
    sku.code,
    productSkuCreateBody.code,
  );

  // 8. Guest creates a cart
  const guestToken = RandomGenerator.alphaNumeric(24);
  const guestCartCreateBody = {
    guest_token: guestToken,
    ip: "192.168.0.10",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    referrer: "https://shop.example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const createdCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBody,
    });
  typia.assert(createdCart);

  TestValidator.equals(
    "created guest cart guest_token should match request body",
    createdCart.guest_token,
    guestCartCreateBody.guest_token,
  );

  // 9. Guest adds an item to the cart
  const initialQuantity: number & tags.Type<"int32"> & tags.Minimum<1> = 1;
  const cartItemCreateBody = {
    sku_id: sku.id,
    quantity: initialQuantity,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const createdItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: createdCart.id,
      body: cartItemCreateBody,
    });
  typia.assert(createdItem);

  TestValidator.equals(
    "guest cart item should reference correct guest cart",
    createdItem.guest_cart_id,
    createdCart.id,
  );

  // 10. Full replacement update: change quantity, currency, and client metadata
  const replacedQuantity: number & tags.Type<"int32"> & tags.Minimum<1> = 3;
  const clientMetadataUpdate = {
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    device_type: "desktop",
    locale: "ko-KR",
  } satisfies IShoppingMallGuestCartClientMetadata.IUpdate;

  const fullReplacementUpdateBody = {
    currency_code: "KRW",
    client_metadata: clientMetadataUpdate,
    items: [
      {
        sku_id: sku.id,
        quantity: replacedQuantity,
      },
    ],
  } satisfies IShoppingMallGuestCart.IUpdate;

  const updatedCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.update(connection, {
      guestCartId: createdCart.id,
      body: fullReplacementUpdateBody,
    });
  typia.assert(updatedCart);

  // Business assertions for full replacement semantics
  TestValidator.equals(
    "updated cart id should remain the same",
    updatedCart.id,
    createdCart.id,
  );

  TestValidator.equals(
    "updated cart guest_token should remain the same",
    updatedCart.guest_token,
    createdCart.guest_token,
  );

  TestValidator.equals(
    "updated cart should contain exactly one item",
    updatedCart.items.length,
    1,
  );

  const updatedItem = updatedCart.items[0];
  TestValidator.equals(
    "updated cart item should reference same SKU",
    updatedItem.product_sku_id,
    createdItem.product_sku_id,
  );

  TestValidator.equals(
    "updated cart item quantity should reflect replacement request",
    updatedItem.quantity,
    replacedQuantity,
  );

  // 11. Optional: full replacement with empty items array clears the cart items
  const clearItemsUpdateBody = {
    currency_code: fullReplacementUpdateBody.currency_code,
    client_metadata: fullReplacementUpdateBody.client_metadata,
    items: [],
  } satisfies IShoppingMallGuestCart.IUpdate;

  const clearedCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.update(connection, {
      guestCartId: createdCart.id,
      body: clearItemsUpdateBody,
    });
  typia.assert(clearedCart);

  TestValidator.equals(
    "cleared cart should have zero items after full replacement with empty array",
    clearedCart.items.length,
    0,
  );
}
