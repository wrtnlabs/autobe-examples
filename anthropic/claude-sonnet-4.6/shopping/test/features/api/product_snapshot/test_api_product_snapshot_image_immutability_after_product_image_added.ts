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

export async function test_api_product_snapshot_image_immutability_after_product_image_added(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Create a product category (admin)
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Step 3: Seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // Step 4: Submit seller approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // Step 5: Admin approves the seller
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
  // Step 6: Seller creates a product with exactly ONE image
  // This auto-generates snapshot #1 capturing the single image
  const imageUrl = typia.random<string & tags.Format<"url">>();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        images: [{ urls: [imageUrl] }],
      },
    },
  );
  typia.assert(product);
  const productId = product.id;
  // Step 7: Add a new image to the live product → triggers snapshot #2
  const imageBundle =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId },
      },
    );
  typia.assert(imageBundle);
  // Step 8: List all product snapshots (expect at least 2)
  const snapshotsPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  TestValidator.predicate(
    "at least 2 snapshots exist",
    snapshotsPage.data.length >= 2,
  );
  // Step 9: Identify snapshot #1 (oldest = initial product creation snapshot)
  // Sort ascending by created_at to get the initial snapshot first
  const sortedSnapshots = [...snapshotsPage.data].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const snapshot1 = sortedSnapshots[0]!;
  const snapshot2 = sortedSnapshots[1]!;
  // Step 10: List images for snapshot #1 to get the original imageId
  const snapshot1ImagesPage =
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      sellerConnection,
      {
        productId,
        snapshotId: snapshot1.id,
        body: {} satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(snapshot1ImagesPage);
  // Verify snapshot #1 has exactly 1 image (immutability pre-check)
  TestValidator.equals(
    "snapshot #1 has exactly 1 image",
    snapshot1ImagesPage.data.length,
    1,
  );
  // Obtain the snapshot image record from snapshot #1
  const snapshot1Image = snapshot1ImagesPage.data[0]!;
  // Verify sequence = 0 for the single image in snapshot #1
  TestValidator.equals(
    "snapshot #1 image sequence is 0",
    snapshot1Image.sequence,
    0,
  );
  // Target operation: GET snapshot image by id
  const retrievedImage =
    await api.functional.shoppingMall.seller.products.snapshots.images.at(
      sellerConnection,
      {
        productId,
        snapshotId: snapshot1.id,
        imageId: snapshot1Image.id,
      },
    );
  typia.assert(retrievedImage);
  // Validate: product_snapshot_id matches snapshot #1 (NOT snapshot #2)
  TestValidator.equals(
    "product_snapshot_id matches snapshot #1",
    retrievedImage.product_snapshot_id,
    snapshot1.id,
  );
  // Validate immutability: url matches the original snapshot #1 image url
  TestValidator.equals(
    "image url matches original snapshot #1 image url",
    retrievedImage.url,
    snapshot1Image.url,
  );
  // Validate sequence = 0 (original single image in snapshot #1)
  TestValidator.equals(
    "retrieved image sequence is 0",
    retrievedImage.sequence,
    0,
  );
  // Validate that product_snapshot_id does NOT match snapshot #2
  TestValidator.notEquals(
    "product_snapshot_id is NOT snapshot #2",
    retrievedImage.product_snapshot_id,
    snapshot2.id,
  );
  // Verify snapshot #2 has exactly 2 images (confirms immutability: snapshot #1 unchanged)
  const snapshot2ImagesPage =
    await api.functional.shoppingMall.seller.products.snapshots.images.index(
      sellerConnection,
      {
        productId,
        snapshotId: snapshot2.id,
        body: {} satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(snapshot2ImagesPage);
  TestValidator.equals(
    "snapshot #2 has exactly 2 images",
    snapshot2ImagesPage.data.length,
    2,
  );
}
