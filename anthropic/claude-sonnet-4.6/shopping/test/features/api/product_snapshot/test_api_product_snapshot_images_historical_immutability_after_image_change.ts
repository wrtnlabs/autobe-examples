import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
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

export async function test_api_product_snapshot_images_historical_immutability_after_image_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup - register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const sellerId = sellerAuth.id;
  // 3. Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 4. Admin approves the seller
  const approvedApproval =
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
  typia.assert(approvedApproval);
  // 5. Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(category);
  // 6. Seller creates a product with 2 specific image URLs
  const originalImage1Url =
    "https://cdn.example.com/original-image-1.jpg" as string &
      tags.Format<"url">;
  const originalImage2Url =
    "https://cdn.example.com/original-image-2.jpg" as string &
      tags.Format<"url">;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        images: [{ urls: [originalImage1Url, originalImage2Url] }],
      },
    },
  );
  typia.assert(product);
  const productId = product.id;
  // 7. Admin retrieves product snapshots to identify S1 (initial snapshot)
  const snapshotPage =
    await api.functional.shoppingMall.admin.sellers.products.snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        productId: productId,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate(
    "at least one snapshot exists after product creation",
    snapshotPage.data.length >= 1,
  );
  // The snapshots are ordered newest first, so S1 is the last one
  const s1Snapshot = snapshotPage.data[snapshotPage.data.length - 1]!;
  const s1SnapshotId = s1Snapshot.id;
  // 8. Seller adds a new image (triggers creation of snapshot S2)
  const newImageUrl =
    "https://cdn.example.com/new-added-image-3.jpg" as string &
      tags.Format<"url">;
  const imageBundle =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          urls: [newImageUrl],
        },
        params: {
          productId: productId,
        },
      },
    );
  typia.assert(imageBundle);
  // === PRIMARY TEST: S1 must still show only original 2 images ===
  const s1ImagesPage =
    await api.functional.shoppingMall.admin.snapshots.images.index(
      adminConnection,
      {
        snapshotId: s1SnapshotId,
        body: {} satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(s1ImagesPage);
  // Assert pagination records = 2
  TestValidator.equals(
    "S1 snapshot should have exactly 2 images",
    s1ImagesPage.pagination.records,
    2,
  );
  // Assert data array has exactly 2 items
  TestValidator.equals(
    "S1 data array should contain exactly 2 image records",
    s1ImagesPage.data.length,
    2,
  );
  // Assert all images belong to S1
  for (const img of s1ImagesPage.data) {
    TestValidator.equals(
      "each image product_snapshot_id should match S1",
      img.product_snapshot_id,
      s1SnapshotId,
    );
  }
  // Assert original image URLs are present
  const s1Urls = s1ImagesPage.data.map((img) => img.url);
  TestValidator.predicate(
    "S1 should contain original image 1 URL",
    s1Urls.some((url) => url.includes("original-image-1")),
  );
  TestValidator.predicate(
    "S1 should contain original image 2 URL",
    s1Urls.some((url) => url.includes("original-image-2")),
  );
  // Assert newly added image is NOT in S1
  TestValidator.predicate(
    "S1 should NOT contain the newly added image URL",
    !s1Urls.some((url) => url.includes("new-added-image-3")),
  );
  // === SECONDARY TEST: S2 must show 3 images including the new one ===
  const updatedSnapshotPage =
    await api.functional.shoppingMall.admin.sellers.products.snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        productId: productId,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(updatedSnapshotPage);
  TestValidator.predicate(
    "at least 2 snapshots should exist after image addition",
    updatedSnapshotPage.data.length >= 2,
  );
  // S2 is the most recent snapshot (first in the list since ordered newest first)
  const s2Snapshot = updatedSnapshotPage.data[0]!;
  const s2SnapshotId = s2Snapshot.id;
  // Ensure S2 is different from S1
  TestValidator.notEquals(
    "S2 snapshot ID should be different from S1",
    s2SnapshotId,
    s1SnapshotId,
  );
  const s2ImagesPage =
    await api.functional.shoppingMall.admin.snapshots.images.index(
      adminConnection,
      {
        snapshotId: s2SnapshotId,
        body: {} satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(s2ImagesPage);
  // Assert S2 has 3 images
  TestValidator.equals(
    "S2 snapshot should have exactly 3 images",
    s2ImagesPage.pagination.records,
    3,
  );
  TestValidator.equals(
    "S2 data array should contain exactly 3 image records",
    s2ImagesPage.data.length,
    3,
  );
  // Assert the new image URL is present in S2
  const s2Urls = s2ImagesPage.data.map((img) => img.url);
  TestValidator.predicate(
    "S2 should contain the newly added image URL",
    s2Urls.some((url) => url.includes("new-added-image-3")),
  );
}
