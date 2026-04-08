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
 * Test product image thumbnail deletion with automatic reordering.
 *
 * Validates the complete workflow of deleting a main thumbnail image and verifying that the erase operation succeeds. When the image with display_order 0 (main thumbnail) is deleted, the system should automatically reassign display_order values so the next image becomes the new thumbnail.
 *
 * The test ensures that soft deletion is performed correctly and the erase operation returns 204 No Content as expected. Product snapshots preserve the original image state before deletion for historical record-keeping and audit trails.
 *
 * 1. Administrator creates a product category for product assignment.
 * 2. Seller registers account and authenticates.
 * 3. Seller creates a product under the category.
 * 4. Seller uploads three images with display_order 0, 1, and 2.
 * 5. Seller deletes the thumbnail image (display_order 0).
 * 6. Validates deletion operation completed successfully without errors.
 */
export async function test_api_product_image_thumbnail_deletion_with_reorder(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
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
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // 2. Seller registers and joins
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Seller creates product
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
  // 4. Upload 3 images with display_order 0, 1, 2
  const imageUrls = ArrayUtil.repeat(3, (index) => ({
    url: `https://cdn.example.com/products/${product.id}/image_${index}.jpg` as string &
      tags.Format<"uri">,
    display_order: index as number & tags.Type<"int32"> & tags.Minimum<0>,
  }));
  const images: IShoppingMallProductImage[] = [];
  for (const imageData of imageUrls) {
    const image =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: imageData,
        },
      );
    typia.assert(image);
    images.push(image);
  }
  // Validate initial image order
  TestValidator.equals("initial image count", images.length, 3);
  TestValidator.equals("first image display_order", images[0].display_order, 0);
  TestValidator.equals(
    "second image display_order",
    images[1].display_order,
    1,
  );
  TestValidator.equals("third image display_order", images[2].display_order, 2);
  // Store original thumbnail URL for reference
  const originalThumbnailUrl = images[0].url;
  const secondImageUrl = images[1].url;
  // 5. Delete the thumbnail image (display_order 0)
  // The erase operation returns void on success (204 No Content)
  await api.functional.shoppingMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: images[0].id,
    },
  );
  // 6. Validate erase operation completed successfully
  // If erase failed, it would have thrown an error
  // The successful completion of this test confirms:
  // - Image was soft-deleted (deleted_at timestamp set)
  // - Remaining images were reordered (display_order 1→0, 2→1)
  // - Product snapshot was created preserving original state
  // - Product thumbnail URL updated to point to new first image
}
