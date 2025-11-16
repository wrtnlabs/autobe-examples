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
 * Validate that product media detail endpoint returns not-found style errors
 * when media id is invalid or not related to the requested product.
 *
 * Business goal
 *
 * - Ensure GET /shoppingMall/products/{productCode}/media/{productMediaId} does
 *   not:
 *
 *   - Accidentally expose media that does not belong to the given product, or
 *   - Succeed when the media record does not exist at all.
 * - Confirm that callers can rely on a clear failure when referencing nonexistent
 *   or cross-product media ids.
 *
 * High level flow
 *
 * 1. Bootstrap a platform admin via join and use it to create a catalog brand.
 * 2. Bootstrap a seller via join so we can create products and media.
 * 3. As the seller, create product A with a unique business code, associated to
 *    the previously created brand.
 * 4. As the seller, attach a media asset M under product A.
 * 5. Scenario #1 (nonexistent media id):
 *
 *    - Call media detail under productCode=A but with a random media id that is
 *         clearly different from M.id.
 *    - Expect the call to fail and throw an HttpError (treated as a generic error in
 *         this test), without asserting specific status codes.
 * 6. Scenario #2 (cross-product misuse):
 *
 *    - As the same seller, create product B.
 *    - Call media detail under productCode=B but with productMediaId=M.id (which
 *         belongs to A, not B).
 *    - Expect the call to fail and throw an error, again without checking specific
 *         status codes, only that it does not succeed.
 *
 * Technical notes and constraints
 *
 * - Use only the provided SDK functions and DTOs; do not invent additional APIs.
 * - Never perform type-error testing or send intentionally invalid-typed
 *   payloads; all request bodies must satisfy the corresponding DTO types.
 * - Do not inspect HTTP status codes or error bodies directly; just assert that
 *   an error is thrown via TestValidator.error.
 * - Do not touch connection.headers directly; authentication context is managed
 *   by the generated SDK join/login functions.
 */
export async function test_api_product_media_detail_not_found_for_wrong_media_id(
  connection: api.IConnection,
) {
  // 1. Platform admin join to gain admin privileges for catalog brand creation
  const platformAdminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a brand as platform admin for product association
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller join to obtain seller auth
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. As seller, create product A
  const productACode = `PROD-A-${RandomGenerator.alphaNumeric(8)}`;
  const productACreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productACode,
    name: `Product A ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.example.com/product/primary/" +
      RandomGenerator.alphaNumeric(12),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productACreateBody,
    });
  typia.assert(productA);

  // 5. As seller, create media M under product A
  const mediaCreateBody = {
    uri:
      "https://cdn.example.com/product/media/" +
      RandomGenerator.alphaNumeric(12),
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 4 }),
    display_order: 1 as number & tags.Type<"int32">,
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const mediaA: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: productA.code,
      body: mediaCreateBody,
    });
  typia.assert(mediaA);

  // 6. Scenario #1: nonexistent media ID for an existing product
  // Ensure bogus id is different from the real media id
  let bogusMediaId: string & tags.Format<"uuid">;
  while (true) {
    const candidate = typia.random<string & tags.Format<"uuid">>();
    if (candidate !== mediaA.id) {
      bogusMediaId = candidate;
      break;
    }
  }

  await TestValidator.error(
    "media detail should fail for nonexistent media id",
    async () => {
      await api.functional.shoppingMall.products.media.at(connection, {
        productCode: productA.code,
        productMediaId: bogusMediaId,
      });
    },
  );

  // 7. Scenario #2: cross-product media misuse (media from A, productCode from B)
  const productBCode = `PROD-B-${RandomGenerator.alphaNumeric(8)}`;
  const productBCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productBCode,
    name: `Product B ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.example.com/product/primary/" +
      RandomGenerator.alphaNumeric(12),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBCreateBody,
    });
  typia.assert(productB);

  await TestValidator.error(
    "media detail should fail when media does not belong to product",
    async () => {
      await api.functional.shoppingMall.products.media.at(connection, {
        productCode: productB.code,
        productMediaId: mediaA.id,
      });
    },
  );
}
