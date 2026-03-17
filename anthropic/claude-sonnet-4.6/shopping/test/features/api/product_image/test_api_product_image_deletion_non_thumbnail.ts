import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
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
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_product_image_deletion_non_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  // =============================================
  // STEP 1: Register seller account
  // =============================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // =============================================
  // STEP 2: Seller submits approval request
  // =============================================
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // =============================================
  // STEP 3: Register admin account
  // =============================================
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // =============================================
  // STEP 4: Admin approves the seller
  // =============================================
  const updatedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(updatedApproval);
  TestValidator.equals(
    "seller approval status is approved",
    updatedApproval.status,
    "approved",
  );
  // =============================================
  // STEP 5: Admin creates a product category
  // =============================================
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(category);
  // =============================================
  // STEP 6: Seller creates a product under the category
  // =============================================
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // =============================================
  // STEP 7: Seller uploads 3 images to the product
  // =============================================
  // Upload all 3 images in a single call with 3 URLs
  const imageBundle =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          urls: [
            typia.random<string & tags.Format<"url">>(),
            typia.random<string & tags.Format<"url">>(),
            typia.random<string & tags.Format<"url">>(),
          ],
        },
      },
    );
  typia.assert(imageBundle);
  // Validate that we have exactly 3 images
  TestValidator.equals(
    "product has 3 images after upload",
    imageBundle.images.length,
    3,
  );
  // Images are ordered by sequence ascending
  // The first image (index 0) is the thumbnail (lowest sequence)
  // The second image (index 1) is the non-thumbnail target for deletion
  // The third image (index 2) is the last image
  const thumbnailImage = imageBundle.images[0];
  const targetImage = imageBundle.images[1]; // This is the one to delete (non-thumbnail)
  const thirdImage = imageBundle.images[2];
  // Validate thumbnail and target images exist and have proper sequences
  TestValidator.predicate(
    "thumbnail image exists",
    thumbnailImage !== undefined,
  );
  TestValidator.predicate("target image exists", targetImage !== undefined);
  TestValidator.predicate("third image exists", thirdImage !== undefined);
  // The thumbnail must have a lower sequence than the target image
  TestValidator.predicate(
    "thumbnail has lower sequence than target",
    thumbnailImage!.sequence < targetImage!.sequence,
  );
  // The target image must have a lower sequence than the third image
  TestValidator.predicate(
    "target has lower sequence than third image",
    targetImage!.sequence < thirdImage!.sequence,
  );
  // =============================================
  // STEP 8: Seller deletes the second image (non-thumbnail)
  // =============================================
  // The delete returns void (HTTP 204)
  await api.functional.shoppingMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: targetImage!.id,
    },
  );
  // =============================================
  // STEP 9: Validate deletion succeeded
  // After deletion, we verify by re-uploading to see the current state
  // =============================================
  // Upload a 4th image to get the updated bundle
  const postDeletionBundle =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          urls: [typia.random<string & tags.Format<"url">>()],
        },
      },
    );
  typia.assert(postDeletionBundle);
  // After deleting 1 of 3 images and uploading 1 new image,
  // we should have 3 images total (2 remaining + 1 new)
  TestValidator.equals(
    "product has 3 images after deletion and new upload",
    postDeletionBundle.images.length,
    3,
  );
  // Validate the deleted image ID is no longer present
  const deletedImageStillExists = postDeletionBundle.images.some(
    (img) => img.id === targetImage!.id,
  );
  TestValidator.equals(
    "deleted image no longer exists in gallery",
    deletedImageStillExists,
    false,
  );
  // Validate the thumbnail image (original first image) still exists
  const thumbnailStillExists = postDeletionBundle.images.some(
    (img) => img.id === thumbnailImage!.id,
  );
  TestValidator.predicate(
    "original thumbnail image still exists",
    thumbnailStillExists,
  );
  // Validate the third image (original index 2) still exists
  const thirdImageStillExists = postDeletionBundle.images.some(
    (img) => img.id === thirdImage!.id,
  );
  TestValidator.predicate(
    "original third image still exists",
    thirdImageStillExists,
  );
  // Validate sequences are contiguous (no gaps)
  const sortedImages = [...postDeletionBundle.images].sort(
    (a, b) => a.sequence - b.sequence,
  );
  for (let i = 0; i < sortedImages.length - 1; i++) {
    TestValidator.predicate(
      `sequence gap check between index ${i} and ${i + 1}`,
      sortedImages[i]!.sequence < sortedImages[i + 1]!.sequence,
    );
  }
  // Validate the first image in the post-deletion bundle is still the thumbnail
  TestValidator.equals(
    "thumbnail image is still the first in post-deletion gallery",
    postDeletionBundle.images[0]!.id,
    thumbnailImage!.id,
  );
}
