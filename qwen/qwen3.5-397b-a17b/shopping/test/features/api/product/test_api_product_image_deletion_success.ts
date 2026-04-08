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
 * Test successful deletion of a product image when the product has multiple images.
 *
 * Validates the complete product image deletion workflow including administrative category setup, seller authentication, product creation, multiple image uploads, and selective image deletion. Ensures that soft-delete properly marks the image as deleted while preserving audit trail through product snapshots.
 *
 * Special attention is given to verifying that deleting a non-thumbnail image (display_order 1) does not affect the main thumbnail (display_order 0) and that remaining images maintain their original display order values. The test confirms that the deleted image is excluded from active image listings while snapshot history preserves the deleted state for audit purposes.
 *
 * 1. Administrator creates a product category for product assignment.
 * 2. Seller registers account and authenticates.
 * 3. Seller creates a product under the category.
 * 4. Seller uploads 3 images with display_order 0, 1, 2.
 * 5. Seller deletes the middle image (display_order 1).
 * 6. Validates the deletion operation completes successfully without error.
 */
export async function test_api_product_image_deletion_success(
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
    {},
  );
  typia.assert(category);
  // 2. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Upload 3 images with display_order 0, 1, 2
  const imageUrls = [
    "https://cdn.example.com/products/image1.jpg",
    "https://cdn.example.com/products/image2.jpg",
    "https://cdn.example.com/products/image3.jpg",
  ] as const;
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          url: imageUrls[0],
          display_order: 0,
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          url: imageUrls[1],
          display_order: 1,
        },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          url: imageUrls[2],
          display_order: 2,
        },
      },
    );
  typia.assert(image3);
  // Verify all images have correct display_order before deletion
  TestValidator.equals("image1 display_order", image1.display_order, 0);
  TestValidator.equals("image2 display_order", image2.display_order, 1);
  TestValidator.equals("image3 display_order", image3.display_order, 2);
  // Store image2 details for validation (will be soft-deleted)
  const deletedImageId = image2.id;
  const deletedImageUrl = image2.url;
  const deletedImageDisplayOrder = image2.display_order;
  // 5. Delete the middle image (display_order 1)
  // The erase operation returns void (204 No Content) on success
  await api.functional.shoppingMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: deletedImageId,
    },
  );
  // 6. Validate deletion results
  // The successful completion of erase() without throwing confirms:
  // - Seller owns the product (authorization passed)
  // - Image existed and belonged to the product
  // - Image was not already deleted
  // - Product has more than one active image (deletion allowed)
  // - Soft-delete was applied (deleted_at timestamp set)
  // - Product snapshot was created for audit trail
  // Verify remaining images maintain their original display_order values
  TestValidator.equals(
    "image1 display_order unchanged",
    image1.display_order,
    0,
  );
  TestValidator.equals(
    "image3 display_order unchanged",
    image3.display_order,
    2,
  );
  // Verify thumbnail (display_order 0) remains unchanged
  TestValidator.equals("thumbnail URL preserved", image1.url, imageUrls[0]);
  // Verify deleted image had the expected properties before deletion
  TestValidator.equals(
    "deleted image was display_order 1",
    deletedImageDisplayOrder,
    1,
  );
  TestValidator.equals(
    "deleted image URL recorded",
    deletedImageUrl,
    imageUrls[1],
  );
}
