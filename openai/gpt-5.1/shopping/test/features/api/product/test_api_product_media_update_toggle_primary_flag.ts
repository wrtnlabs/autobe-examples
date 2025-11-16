import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductMedia";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Toggle primary product media for a seller-owned product and validate update
 * behavior.
 *
 * Business flow implemented in this test:
 *
 * 1. Register a seller via /auth/seller/join to obtain authenticated seller
 *    context.
 * 2. Register and log in a platform admin via /auth/platformAdmin/join and
 *    /auth/platformAdmin/login.
 * 3. Using the platform admin context, create a brand via
 *    /shoppingMall/platformAdmin/brands.
 * 4. Switch back to seller context (login) to own and create a product via
 *    /shoppingMall/seller/products, associating it with the created brand.
 * 5. For that product, create two media records via POST
 *    /shoppingMall/seller/products/{productCode}/media:
 *
 *    - MediaA: is_primary=true, display_order=1
 *    - MediaB: is_primary=false, display_order=2
 * 6. Call PUT /shoppingMall/seller/products/{productCode}/media/{productMediaId}
 *    on mediaB, with body setting is_primary=true (other fields omitted to keep
 *    them unchanged).
 * 7. Assert that the response for the update call reports is_primary=true and that
 *    the media id matches mediaB.
 * 8. Since no media listing endpoint is available, we at least validate that
 *    update returns a structurally valid IShoppingMallProductMedia and that
 *    toggling is_primary on one record succeeds without conflict.
 */
export async function test_api_product_media_update_toggle_primary_flag(
  connection: api.IConnection,
) {
  // 1. Register seller (join implicitly logs them in and sets Authorization header)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Register platform admin (join) and log in as platform admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(20),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorizedJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(
    platformAdminAuthorizedJoin,
  );

  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminAuthorizedLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(
    platformAdminAuthorizedLogin,
  );

  // 3. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 10 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 10,
    }),
    logo_uri:
      "https://cdn.shoppingmall.test/logos/" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 4. Switch back to seller context via explicit seller login
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerAuthorizedLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedLogin);

  // 5. Create a product for the seller associated with the created brand
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    12,
  ) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorizedLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    short_description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 10,
    }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.shoppingmall.test/products/" + productCode + "/primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "product code should match the requested code",
    product.code,
    productCode,
  );

  // 6. Create two media records for this product
  const mediaABaseUri =
    "https://cdn.shoppingmall.test/products/" + product.code + "/media/";

  const mediaACreateBody = {
    uri: mediaABaseUri + "imageA.png",
    media_type: "image",
    alt_text: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 8,
    }),
    display_order: 1 as number & tags.Type<"int32">,
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const mediaA: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: mediaACreateBody,
    });
  typia.assert<IShoppingMallProductMedia>(mediaA);

  const mediaBCreateBody = {
    uri: mediaABaseUri + "imageB.png",
    media_type: "image",
    alt_text: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 8,
    }),
    display_order: 2 as number & tags.Type<"int32">,
    is_primary: false,
  } satisfies IShoppingMallProductMedia.ICreate;

  const mediaB: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: mediaBCreateBody,
    });
  typia.assert<IShoppingMallProductMedia>(mediaB);

  TestValidator.equals(
    "media A should be primary initially",
    mediaA.is_primary,
    true,
  );
  TestValidator.equals(
    "media B should be non-primary initially",
    mediaB.is_primary,
    false,
  );

  // 7. Toggle primary flag to mediaB using update endpoint
  const updateBodyForMediaB = {
    is_primary: true,
  } satisfies IShoppingMallProductMedia.IUpdate;

  const updatedMediaB: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.update(connection, {
      productCode: product.code,
      productMediaId: mediaB.id,
      body: updateBodyForMediaB,
    });
  typia.assert<IShoppingMallProductMedia>(updatedMediaB);

  // 8. Assertions around the updated media
  TestValidator.equals(
    "updated media B id should match original media B id",
    updatedMediaB.id,
    mediaB.id,
  );
  TestValidator.equals(
    "updated media B should now be primary",
    updatedMediaB.is_primary,
    true,
  );

  TestValidator.equals(
    "updated media B product summary id should match product id",
    updatedMediaB.product.id,
    product.id,
  );
}
