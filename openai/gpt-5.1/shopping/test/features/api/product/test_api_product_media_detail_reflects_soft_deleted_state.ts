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
 * Validate that product media detail endpoint reflects media metadata and
 * exposes soft-delete field.
 *
 * Business workflow implemented:
 *
 * 1. Register a platform admin (join) and establish admin authentication context.
 * 2. As platform admin, create a brand to be associated with the test product.
 * 3. Register a seller (join) and establish seller authentication context.
 * 4. As seller, create a product that references the created brand.
 * 5. As seller, create a media asset for that product.
 * 6. Call the public product media detail endpoint to fetch that media by product
 *    code and media id.
 * 7. Verify that the detailed media response matches the created media and that
 *    deleted_at is present and null (i.e., not soft-deleted).
 *
 * Although the high-level scenario mentions inspecting a soft-deleted media
 * (deleted_at non-null), we do not have any delete/soft-delete endpoint in the
 * provided SDK, so this test focuses on the active case while still validating
 * that the deleted_at field is part of the read model and currently unset.
 */
export async function test_api_product_media_detail_reflects_soft_deleted_state(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) to gain platformAdmin privileges.
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdmin);

  // Optionally exercise platformAdmin login using the same email/password.
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminLoggedIn);

  // 2. As platform admin, create a brand.
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 3. Register a seller and establish seller authentication context.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // Optionally exercise seller login as well.
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);

  // 4. As seller, create a product, associated to the created brand.
  //    Use the authenticated seller's id for shopping_mall_seller_id.
  const productCode: string = RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "created product code should match requested code",
    product.code,
    productCode,
  );
  TestValidator.equals(
    "product brand summary id should match created brand id when present",
    product.brand?.id ?? brand.id,
    brand.id,
  );

  // 5. As seller, create a media asset for that product.
  const mediaCreateBody = {
    uri: typia.random<string & tags.Format<"uri">>(),
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const createdMedia: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: mediaCreateBody,
    });
  typia.assert<IShoppingMallProductMedia>(createdMedia);

  TestValidator.equals(
    "created media product summary id should match product id",
    createdMedia.product.id,
    product.id,
  );

  // 6. Fetch the media via the public product media detail endpoint.
  const detailedMedia: IShoppingMallProductMedia =
    await api.functional.shoppingMall.products.media.at(connection, {
      productCode: product.code,
      productMediaId: createdMedia.id,
    });
  typia.assert<IShoppingMallProductMedia>(detailedMedia);

  // 7. Validate core invariants between create and detail responses.
  TestValidator.equals(
    "media id should match between create and detail",
    detailedMedia.id,
    createdMedia.id,
  );
  TestValidator.equals(
    "media uri should match between create and detail",
    detailedMedia.uri,
    createdMedia.uri,
  );
  TestValidator.equals(
    "media_type should match between create and detail",
    detailedMedia.media_type,
    createdMedia.media_type,
  );
  TestValidator.equals(
    "display_order should match between create and detail",
    detailedMedia.display_order,
    createdMedia.display_order,
  );
  TestValidator.equals(
    "is_primary should match between create and detail",
    detailedMedia.is_primary,
    createdMedia.is_primary,
  );

  // deleted_at should be null or undefined for a freshly created, non-deleted media.
  TestValidator.predicate(
    "deleted_at should be null or undefined for newly created media",
    detailedMedia.deleted_at === null || detailedMedia.deleted_at === undefined,
  );

  // Validate that the embedded product summary remains consistent.
  TestValidator.equals(
    "detailed media product summary id should match created product id",
    detailedMedia.product.id,
    product.id,
  );
  TestValidator.equals(
    "detailed media product summary name should match created product name",
    detailedMedia.product.name,
    product.name,
  );
}
