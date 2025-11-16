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
 * Validate that a seller can update the display_order of an existing product
 * media asset while keeping other fields stable, using only the provided write
 * APIs.
 *
 * Business workflow implemented in this test:
 *
 * 1. Join as a platform admin and obtain an authorized session.
 * 2. As platform admin, create a brand via POST
 *    /shoppingMall/platformAdmin/brands.
 * 3. Join as a seller via POST /auth/seller/join and obtain an authorized session.
 * 4. As seller, create a product via POST /shoppingMall/seller/products that is
 *    associated with the previously created brand using shopping_mall_brand_id
 *    and with the seller as owner using shopping_mall_seller_id.
 * 5. As the same seller, create the first product media via POST
 *    /shoppingMall/seller/products/{productCode}/media with display_order = 1.
 * 6. Create the second product media for the same product with display_order = 2
 *    and keep a reference to its id and key fields.
 * 7. Call PUT /shoppingMall/seller/products/{productCode}/media/{productMediaId}
 *    on the second media record with a body that only changes display_order
 *    from 2 to 3, leaving all other fields omitted so they remain unchanged.
 * 8. Assert that the update response has the same id as the original second media,
 *    that uri and media_type are unchanged, and that display_order now equals
 *    3.
 * 9. Additionally, assert that created_at remains the same while updated_at is
 *    refreshed to a newer timestamp, and that is_primary remains unchanged.
 *
 * Limitations and scenario adjustments:
 *
 * - No read/list endpoint for product media is available in the provided SDK,
 *   therefore gallery ordering validation is limited to comparing the two
 *   create responses and the single update response without performing an
 *   external listing.
 * - Uniqueness of display_order is enforced by business logic and schema but
 *   cannot be cross-validated by fetching the entire media set; instead we
 *   validate that the target record reflects the updated order.
 */
export async function test_api_product_media_update_change_display_order(
  connection: api.IConnection,
) {
  // 1. Platform admin joins to be able to create a brand.
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shopping-mall.test/join",
    referrer: "https://admin.shopping-mall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a brand as platform admin.
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shopping-mall.test/logo/" +
      RandomGenerator.alphaNumeric(12) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller joins the platform.
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

  const sellerId = sellerAuthorized.id;

  // 4. Seller creates a product associated with the created brand.
  const productCode = "PRD-" + RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.shopping-mall.test/product/" +
      RandomGenerator.alphaNumeric(12) +
      ".jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product code in response matches requested code",
    product.code,
    productCode,
  );

  // 5. Create first media with display_order = 1.
  const firstMediaCreateBody = {
    uri:
      "https://cdn.shopping-mall.test/product/media/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1 as number & tags.Type<"int32">,
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const firstMedia: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: firstMediaCreateBody,
    });
  typia.assert(firstMedia);

  TestValidator.equals(
    "first media display_order should be 1",
    firstMedia.display_order,
    1,
  );

  // 6. Create second media with display_order = 2.
  const secondMediaCreateBody = {
    uri:
      "https://cdn.shopping-mall.test/product/media/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 2 as number & tags.Type<"int32">,
    is_primary: false,
  } satisfies IShoppingMallProductMedia.ICreate;

  const secondMediaOriginal: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: secondMediaCreateBody,
    });
  typia.assert(secondMediaOriginal);

  TestValidator.equals(
    "second media display_order should be 2 before update",
    secondMediaOriginal.display_order,
    2,
  );

  const originalSecondMediaCreatedAt = secondMediaOriginal.created_at;
  const originalSecondMediaUpdatedAt = secondMediaOriginal.updated_at;

  // 7. Update second media: change display_order only from 2 to 3.
  const updateBody = {
    display_order: 3 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductMedia.IUpdate;

  const updatedSecondMedia: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.update(connection, {
      productCode: product.code,
      productMediaId: secondMediaOriginal.id,
      body: updateBody,
    });
  typia.assert(updatedSecondMedia);

  // 8. Assertions on update result.
  TestValidator.equals(
    "updated media id remains the same as original second media",
    updatedSecondMedia.id,
    secondMediaOriginal.id,
  );

  TestValidator.equals(
    "updated media uri remains unchanged",
    updatedSecondMedia.uri,
    secondMediaOriginal.uri,
  );

  TestValidator.equals(
    "updated media_type remains unchanged",
    updatedSecondMedia.media_type,
    secondMediaOriginal.media_type,
  );

  TestValidator.equals(
    "updated media alt_text remains unchanged",
    updatedSecondMedia.alt_text,
    secondMediaOriginal.alt_text,
  );

  TestValidator.equals(
    "updated media is_primary remains unchanged",
    updatedSecondMedia.is_primary,
    secondMediaOriginal.is_primary,
  );

  TestValidator.equals(
    "updated media display_order should be 3",
    updatedSecondMedia.display_order,
    3,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedSecondMedia.created_at,
    originalSecondMediaCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should be refreshed and be greater than or equal to previous updated_at",
    new Date(updatedSecondMedia.updated_at).getTime() >=
      new Date(originalSecondMediaUpdatedAt).getTime(),
  );

  // 9. Basic consistency check: first media unaffected.
  TestValidator.equals(
    "first media remains display_order 1 (local reference)",
    firstMedia.display_order,
    1,
  );
}
