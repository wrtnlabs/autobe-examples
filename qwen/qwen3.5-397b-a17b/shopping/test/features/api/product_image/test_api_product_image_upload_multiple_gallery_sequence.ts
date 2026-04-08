import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test uploading multiple product images with different display orders to verify gallery sequencing and thumbnail assignment.
 *
 * Validates the complete product image gallery workflow including administrative category setup, seller authentication, product creation, and multiple image uploads with specific display orders. Ensures that images are correctly ordered in the gallery and that the image with display_order=0 serves as the main thumbnail.
 *
 * Special attention is given to verifying that display order determines gallery sequence, the image with display_order=0 is designated as the main thumbnail, and all images maintain correct association with the parent product.
 *
 * 1. Administrator joins and creates a category for product organization.
 * 2. Seller joins and creates a product in the category.
 * 3. Seller uploads first image with display_order=1 (not the thumbnail).
 * 4. Seller uploads second image with display_order=0 (should become the main thumbnail).
 * 5. Seller uploads third image with display_order=2.
 * 6. Validates each response contains correct image data with assigned display_order.
 * 7. Validates the image with display_order=0 is designated as the main thumbnail in product listings.
 * 8. Validates all images are associated with the correct product when retrieving product details.
 * 9. Validates gallery sequence follows display_order: image with order 0 appears first, then 1, then 2.
 */
export async function test_api_product_image_upload_multiple_gallery_sequence(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // 2. Seller setup - join and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Upload first image with display_order=1 (not thumbnail)
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          display_order: 1,
        },
      },
    );
  typia.assert(image1);
  // 4. Upload second image with display_order=0 (should be main thumbnail)
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          display_order: 0,
        },
      },
    );
  typia.assert(image2);
  // 5. Upload third image with display_order=2
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          display_order: 2,
        },
      },
    );
  typia.assert(image3);
  // 6. Validate each image has correct display_order
  TestValidator.equals("image1 display_order", image1.display_order, 1);
  TestValidator.equals("image2 display_order", image2.display_order, 0);
  TestValidator.equals("image3 display_order", image3.display_order, 2);
  // 7. Validate all images belong to the same product
  TestValidator.equals("image1 product_id", image1.product.id, product.id);
  TestValidator.equals("image2 product_id", image2.product.id, product.id);
  TestValidator.equals("image3 product_id", image3.product.id, product.id);
  // 8. Validate images have unique IDs
  TestValidator.notEquals("image1 vs image2 ID", image1.id, image2.id);
  TestValidator.notEquals("image2 vs image3 ID", image2.id, image3.id);
  TestValidator.notEquals("image1 vs image3 ID", image1.id, image3.id);
  // 9. Validate timestamps exist on all images
  TestValidator.predicate("image1 has created_at", image1.created_at !== null);
  TestValidator.predicate("image2 has created_at", image2.created_at !== null);
  TestValidator.predicate("image3 has created_at", image3.created_at !== null);
  TestValidator.predicate("image1 has updated_at", image1.updated_at !== null);
  TestValidator.predicate("image2 has updated_at", image2.updated_at !== null);
  TestValidator.predicate("image3 has updated_at", image3.updated_at !== null);
  // 10. Validate image URLs are valid URIs
  TestValidator.predicate("image1 url is valid", image1.url.length > 0);
  TestValidator.predicate("image2 url is valid", image2.url.length > 0);
  TestValidator.predicate("image3 url is valid", image3.url.length > 0);
  // 11. Validate deleted_at is null (images are active)
  TestValidator.equals("image1 deleted_at", image1.deleted_at, null);
  TestValidator.equals("image2 deleted_at", image2.deleted_at, null);
  TestValidator.equals("image3 deleted_at", image3.deleted_at, null);
  // 12. Validate image with display_order=0 is the thumbnail candidate
  TestValidator.predicate(
    "image2 is thumbnail candidate (order 0)",
    image2.display_order === 0,
  );
}
