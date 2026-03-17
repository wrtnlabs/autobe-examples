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

export async function test_api_product_image_reorder_thumbnail_update(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Admin setup ───────────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ─── 2. Create product category ───────────────────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Electronics",
        parent_id: null,
      },
    },
  );
  typia.assert(category);
  // ─── 3. Seller setup ──────────────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // ─── 4. Submit seller approval request ────────────────────────────────────
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // ─── 5. Admin approves seller ─────────────────────────────────────────────
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
  // ─── 6. Seller creates product ────────────────────────────────────────────
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        name: "Test Product",
        description: "A product for testing image reorder",
        base_price: 9900,
      },
    },
  );
  typia.assert(product);
  // ─── 7. Seller uploads 3 images to the product ────────────────────────────
  const imageBundle =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          urls: [
            "https://example.com/img1.jpg",
            "https://example.com/img2.jpg",
            "https://example.com/img3.jpg",
          ],
        },
      },
    );
  typia.assert(imageBundle);
  // Verify we have exactly 3 images
  TestValidator.equals(
    "uploaded image count is 3",
    imageBundle.images.length,
    3,
  );
  // Record image IDs in ascending sequence order
  const sortedImages = [...imageBundle.images].sort(
    (a, b) => a.sequence - b.sequence,
  );
  const imgId1 = sortedImages[0]!.id;
  const imgId2 = sortedImages[1]!.id;
  const imgId3 = sortedImages[2]!.id;
  // ─── 8. Reorder images: place imgId3 first (new thumbnail), then imgId1, imgId2 ──
  const reorderResult =
    await api.functional.shoppingMall.products.images.reorder(
      sellerConnection,
      {
        productId: product.id,
        body: {
          imageIds: [imgId3, imgId1, imgId2],
        } satisfies IShoppingMallProductImage.IReorder,
      },
    );
  typia.assert(reorderResult);
  // ─── 9. Assertions ────────────────────────────────────────────────────────
  // 9a. Exactly 3 images in result
  TestValidator.equals(
    "reorder result images count",
    reorderResult.images.length,
    3,
  );
  const resultImages = reorderResult.images;
  // 9b. First image (index 0) is imgId3 (new main thumbnail)
  TestValidator.equals(
    "first image is imgId3 (new thumbnail)",
    resultImages[0]!.id,
    imgId3,
  );
  // 9c. Second image is imgId1
  TestValidator.equals("second image is imgId1", resultImages[1]!.id, imgId1);
  // 9d. Third image is imgId2
  TestValidator.equals("third image is imgId2", resultImages[2]!.id, imgId2);
  // 9e. All images belong to the correct product
  for (const img of resultImages) {
    TestValidator.equals(
      "image belongs to product",
      img.shopping_mall_product_id,
      product.id,
    );
  }
  // 9f. Sequence values are strictly ascending
  TestValidator.predicate(
    "sequence values strictly ascending",
    resultImages[0]!.sequence < resultImages[1]!.sequence &&
      resultImages[1]!.sequence < resultImages[2]!.sequence,
  );
}
