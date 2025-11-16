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
 * Validate successful creation of a product media asset for an existing
 * product.
 *
 * Business flow:
 *
 * 1. Create and authenticate a platform admin via /auth/platformAdmin/join.
 * 2. Login as that platform admin via /auth/platformAdmin/login to simulate a
 *    fresh session.
 * 3. Create a brand via /shoppingMall/platformAdmin/brands using the platform
 *    admin context.
 * 4. Create and authenticate a seller via /auth/seller/join.
 * 5. As the authenticated seller, create a product via
 *    /shoppingMall/seller/products, referencing the created brand and using a
 *    unique product code.
 * 6. As the same seller, create a product media asset via
 *    /shoppingMall/seller/products/{productCode}/media with a valid
 *    IShoppingMallProductMedia.ICreate body.
 * 7. Assert that the returned IShoppingMallProductMedia links to the correct
 *    product, reflects the requested media fields, and that
 *    created_at/updated_at are populated while deleted_at is null/undefined.
 */
export async function test_api_product_media_creation_for_existing_product(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also authenticates and sets Authorization header)
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

  // 2. Explicit login as platform admin to simulate a typical session flow
  const platformAdminLoginBody = {
    email: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 3. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shoppingmall.test/logos/" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Register seller (join also authenticates seller and updates connection Authorization)
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

  // 5. Create a product as the authenticated seller
  const productCode = `P-${RandomGenerator.alphaNumeric(12)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.shoppingmall.test/products/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Sanity checks on product
  TestValidator.equals(
    "created product code matches request",
    product.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "created product seller id matches authorized seller",
    product.seller.id,
    sellerAuthorized.id,
  );
  if (product.brand !== undefined && product.brand !== null) {
    TestValidator.equals(
      "created product brand id matches request brand id",
      product.brand.id,
      brand.id,
    );
  }

  // 6. Create product media for the created product code
  const displayOrder: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32">
  >();

  const mediaCreateBody = {
    uri:
      "https://cdn.shoppingmall.test/products/" +
      product.code +
      "/media-" +
      RandomGenerator.alphaNumeric(8) +
      ".jpg",
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: displayOrder,
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const media: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: mediaCreateBody,
    });
  typia.assert(media);

  // 7. Business assertions on media response
  TestValidator.equals(
    "media uri matches request",
    media.uri,
    mediaCreateBody.uri,
  );
  TestValidator.equals(
    "media type matches request",
    media.media_type,
    mediaCreateBody.media_type,
  );
  TestValidator.equals(
    "media alt_text matches request",
    media.alt_text,
    mediaCreateBody.alt_text,
  );
  TestValidator.equals(
    "media display_order matches request",
    media.display_order,
    mediaCreateBody.display_order,
  );
  TestValidator.equals(
    "media is_primary matches request",
    media.is_primary,
    mediaCreateBody.is_primary,
  );

  // Linkage to product summary
  TestValidator.equals(
    "media product id matches created product id",
    media.product.id,
    product.id,
  );
  TestValidator.equals(
    "media product name matches created product name",
    media.product.name,
    product.name,
  );

  // created_at / updated_at non-emptiness (typia.assert already validates format)
  await TestValidator.predicate(
    "media created_at has non-empty value",
    async () => media.created_at.length > 0,
  );
  await TestValidator.predicate(
    "media updated_at has non-empty value",
    async () => media.updated_at.length > 0,
  );
  await TestValidator.predicate(
    "media deleted_at is null or undefined",
    async () => media.deleted_at === null || media.deleted_at === undefined,
  );
}
