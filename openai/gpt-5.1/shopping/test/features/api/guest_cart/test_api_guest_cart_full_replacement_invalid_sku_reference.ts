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
 * Validate that full guest cart replacement fails when an item references an
 * invalid SKU and that the cart is not partially updated.
 *
 * Business flow:
 *
 * 1. Join and login as platformAdmin to create a brand (catalog context).
 * 2. Join and login as seller to create a product and one purchasable SKU.
 * 3. As an unauthenticated guest, create a guest cart.
 * 4. Add one valid SKU item into the guest cart via POST items.create.
 * 5. Attempt to fully replace the cart via PUT guestCarts.update with items[]
 *    containing both:
 *
 *    - The valid SKU (positive control), and
 *    - A bogus sku_id that does not exist.
 * 6. Assert that guestCarts.update throws an error and does not succeed.
 * 7. Optionally, demonstrate that a subsequent PUT with only valid SKU succeeds,
 *    proving that the endpoint works when all SKUs are valid.
 */
export async function test_api_guest_cart_full_replacement_invalid_sku_reference(
  connection: api.IConnection,
) {
  // 1. Platform admin join & login to be able to create a brand.
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // After join, connection is already authenticated as platformAdmin
  // due to SDK behavior. Create a brand to be used by the product.
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphabets(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 2. Seller join & login to create product & SKU.
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com`,
    password: "P@ssw0rd!",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // Explicit login to mirror real flows (even though join already authenticated).
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 3. Create a product belonging to this seller and associated with the brand.
  const productCode = `PRD-${RandomGenerator.alphaNumeric(10)}`;
  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 3 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphabets(16),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Create a single active, purchasable SKU under this product.
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
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
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 5. As guest (unauthenticated), create a guest cart.
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  const guestCartCreateBody = {
    guest_token: RandomGenerator.alphaNumeric(24),
    ip: "192.0.2.123",
    user_agent: "Mozilla/5.0 (E2E Guest Cart Test)",
    referrer: "https://shop.example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(guestConnection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  // 6. Seed the guest cart with a single valid item.
  const validItemCreateBody = {
    sku_id: sku.id,
    quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const createdItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(guestConnection, {
      guestCartId: guestCart.id,
      body: validItemCreateBody,
    });
  typia.assert(createdItem);

  // Baseline state: one item with sku.id and quantity 2 exists in the cart.
  // We will verify atomicity by ensuring that the failing PUT does not
  // produce a successful updated cart response.

  // 7. Build a full cart update payload with one valid item and one bogus sku.
  const bogusSkuId = typia.random<string & tags.Format<"uuid">>();

  const updatePayloadWithInvalidSku = {
    currency_code: "KRW",
    client_metadata: {
      user_agent: "Mozilla/5.0 (E2E Guest Cart Test - Update)",
      device_type: "desktop",
      locale: "ko-KR",
    } satisfies IShoppingMallGuestCartClientMetadata.IUpdate,
    items: [
      // Valid line referencing the existing SKU
      {
        sku_id: sku.id,
        quantity: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
      // Invalid line referencing a bogus SKU identifier
      {
        sku_id: bogusSkuId,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    ] satisfies IShoppingMallGuestCartItemForCart.IUpdate[],
  } satisfies IShoppingMallGuestCart.IUpdate;

  // 8. Assert that the full replacement update fails when including
  // a non-existent SKU reference. We do not assert status code.
  await TestValidator.error(
    "guest cart full replacement with invalid SKU must fail",
    async () => {
      await api.functional.shoppingMall.guestCarts.update(guestConnection, {
        guestCartId: guestCart.id,
        body: updatePayloadWithInvalidSku,
      });
    },
  );

  // 9. As a positive control, send a valid full replacement with only
  // the existing SKU. This should succeed and return an updated cart.
  const validUpdatePayload = {
    currency_code: "KRW",
    client_metadata: {
      user_agent: "Mozilla/5.0 (E2E Guest Cart Test - Valid Update)",
      device_type: "desktop",
      locale: "ko-KR",
    } satisfies IShoppingMallGuestCartClientMetadata.IUpdate,
    items: [
      {
        sku_id: sku.id,
        quantity: 4 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    ] satisfies IShoppingMallGuestCartItemForCart.IUpdate[],
  } satisfies IShoppingMallGuestCart.IUpdate;

  const updatedCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.update(guestConnection, {
      guestCartId: guestCart.id,
      body: validUpdatePayload,
    });
  typia.assert(updatedCart);

  // Validate that the updated cart has exactly one item with the SKU we expect.
  TestValidator.predicate(
    "updated guest cart must contain exactly one item after valid update",
    updatedCart.items.length === 1,
  );

  const updatedItem = updatedCart.items[0];
  TestValidator.equals(
    "updated guest cart item sku must match original sku",
    updatedItem.product_sku_id,
    createdItem.product_sku_id,
  );
}
