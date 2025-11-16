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

export async function test_api_product_media_detail_retrieval_for_existing_media(
  connection: api.IConnection,
) {
  /** 1. Register a platform admin and obtain admin auth context. */
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  /** 2. Create a brand as platform admin. */
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shoppingmall.test/logo/" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  /** 3. Register a seller to obtain seller auth context. */
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
  typia.assert(sellerAuthorized);

  /** 4. Create a product under the seller, associated with the brand. */
  const productCode: string & tags.MinLength<1> =
    RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" satisfies string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.shoppingmall.test/product/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  /** 5. Create a media asset for the created product as the seller. */
  const mediaCreateBody = {
    uri:
      "https://cdn.shoppingmall.test/product-media/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 4 }),
    display_order: 1 satisfies number & tags.Type<"int32">,
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const createdMedia: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode,
      body: mediaCreateBody,
    });
  typia.assert(createdMedia);

  /** 6. Retrieve media detail using the public GET endpoint. */
  const retrievedMedia: IShoppingMallProductMedia =
    await api.functional.shoppingMall.products.media.at(connection, {
      productCode,
      productMediaId: createdMedia.id,
    });
  typia.assert(retrievedMedia);

  /** 7. Business validations on retrieved media and product summary. */
  TestValidator.equals(
    "created and retrieved media IDs must match",
    retrievedMedia.id,
    createdMedia.id,
  );

  TestValidator.equals(
    "product summary id in media must match created product id",
    retrievedMedia.product.id,
    product.id,
  );

  TestValidator.equals(
    "product summary name in media must match created product name",
    retrievedMedia.product.name,
    product.name,
  );

  TestValidator.equals(
    "media URI must be preserved between create and retrieve",
    retrievedMedia.uri,
    createdMedia.uri,
  );

  TestValidator.equals(
    "media type must be preserved between create and retrieve",
    retrievedMedia.media_type,
    createdMedia.media_type,
  );

  TestValidator.equals(
    "display_order must be preserved between create and retrieve",
    retrievedMedia.display_order,
    createdMedia.display_order,
  );

  TestValidator.equals(
    "is_primary flag must be preserved between create and retrieve",
    retrievedMedia.is_primary,
    createdMedia.is_primary,
  );

  TestValidator.predicate(
    "retrieved media created_at must be a non-empty ISO timestamp",
    ((): boolean => {
      const createdAt = retrievedMedia.created_at;
      return createdAt.length > 0;
    })(),
  );

  TestValidator.predicate(
    "retrieved media updated_at must be a non-empty ISO timestamp",
    ((): boolean => {
      const updatedAt = retrievedMedia.updated_at;
      return updatedAt.length > 0;
    })(),
  );

  TestValidator.predicate(
    "retrieved media deleted_at must be null or undefined for active media",
    retrievedMedia.deleted_at === null ||
      retrievedMedia.deleted_at === undefined,
  );
}
