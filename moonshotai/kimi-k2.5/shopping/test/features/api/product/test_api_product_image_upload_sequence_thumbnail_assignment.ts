import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test seller uploading multiple images to their own product.
 *
 * This E2E test validates:
 * 1. Admin creates a category prerequisite
 * 2. Seller authenticates and creates a product assigned to the category
 * 3. First image upload receives displayOrder = 0 and becomes main thumbnail
 * 4. Second image upload receives displayOrder = 1 and appears in secondary position
 * 5. Both images returned with correct metadata (UUID, URL, timestamps)
 * 6. Product now has multiple images in its collection
 */
export async function test_api_product_image_upload_sequence_thumbnail_assignment(
  connection: api.IConnection,
) {
  // 1. Admin authentication to create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 1,
          wordMax: 3,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // 3. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody: IEcommerceMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);
  // 4. Seller creates product with the category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 5,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Upload first image to the product
  const firstImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: `https://example.com/images/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
        },
      },
    );
  typia.assert(firstImage);
  // Verify first image properties
  TestValidator.equals(
    "first image displayOrder is 0",
    firstImage.displayOrder,
    0,
  );
  TestValidator.predicate(
    "first image has valid UUID",
    typia.is<string & tags.Format<"uuid">>(firstImage.id),
  );
  TestValidator.predicate(
    "first image has URL",
    typeof firstImage.imageUrl === "string",
  );
  TestValidator.predicate(
    "first image has createdAt",
    typeof firstImage.createdAt === "string",
  );
  TestValidator.predicate(
    "first image has updatedAt",
    typeof firstImage.updatedAt === "string",
  );
  TestValidator.predicate(
    "first image has product reference",
    firstImage.product !== null,
  );
  // 6. Upload second image to the product
  const secondImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: `https://example.com/images/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
        },
      },
    );
  typia.assert(secondImage);
  // Verify second image properties
  TestValidator.equals(
    "second image displayOrder is 1",
    secondImage.displayOrder,
    1,
  );
  TestValidator.predicate(
    "second image has valid UUID",
    typia.is<string & tags.Format<"uuid">>(secondImage.id),
  );
  TestValidator.predicate(
    "second image has URL",
    typeof secondImage.imageUrl === "string",
  );
  TestValidator.predicate(
    "second image has createdAt",
    typeof secondImage.createdAt === "string",
  );
  TestValidator.predicate(
    "second image has updatedAt",
    typeof secondImage.updatedAt === "string",
  );
  TestValidator.predicate(
    "second image has product reference",
    secondImage.product !== null,
  );
  // 7. Verify images have different IDs
  TestValidator.notEquals(
    "images have different IDs",
    firstImage.id,
    secondImage.id,
  );
  // 8. Verify product references match
  TestValidator.equals(
    "both images belong to same product",
    firstImage.product.id,
    product.id,
  );
  TestValidator.equals(
    "second image belongs to same product",
    secondImage.product.id,
    product.id,
  );
}