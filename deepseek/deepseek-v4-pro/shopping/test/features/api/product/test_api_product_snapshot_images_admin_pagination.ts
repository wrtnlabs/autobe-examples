import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
 * Test that an administrator can retrieve paginated snapshot images ordered by display_order ascending.
 *
 * Validates the complete workflow for browsing snapshot image galleries through the admin endpoint. The test verifies that after a seller uploads three images and edits the product (triggering a snapshot), the administrator can paginate through the captured snapshot images and confirm correct ordering, field presence, original image references, and accurate pagination metadata.
 *
 * 1. Administrator registers and authenticates via join.
 * 2. Seller registers via join, administrator approves the seller.
 * 3. Administrator creates a product category.
 * 4. Seller creates a product under the category.
 * 5. Seller uploads three images sequentially, assigned display orders 0, 1, 2.
 * 6. Seller edits the product to trigger an automatic snapshot that captures all three images.
 * 7. Administrator retrieves the product's snapshot history to obtain the most recent snapshotId.
 * 8. Administrator calls the snapshot images endpoint with page=1 and limit=10.
 * 9. Validates response contains exactly 3 images.
 * 10. Validates images are ordered by display_order ascending (0, 1, 2).
 * 11. Validates originalImage references are populated since source images still exist.
 * 12. Validates pagination metadata: current page, limit, total records (3), and total pages (1) are accurate.
 */
export async function test_api_product_snapshot_images_admin_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Admin creates category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 5. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  // 6. Seller uploads three images
  await generate_random_shopping_mall_seller_products_images_create(
    sellerConnection,
    { params: { productId: product.id } },
  );
  await generate_random_shopping_mall_seller_products_images_create(
    sellerConnection,
    { params: { productId: product.id } },
  );
  await generate_random_shopping_mall_seller_products_images_create(
    sellerConnection,
    { params: { productId: product.id } },
  );
  // 7. Seller edits product to trigger snapshot
  await api.functional.shoppingMall.seller.products.update(sellerConnection, {
    productId: product.id,
    body: {
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      shopping_mall_category_id: category.id,
      base_price: 15000,
    } satisfies IShoppingMallProduct.IUpdate,
  });
  // 8. Admin retrieves snapshot history
  const snapshots =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshots);
  const snapshot = snapshots.data[0];
  // 9. Admin retrieves paginated snapshot images
  const result =
    await api.functional.shoppingMall.admin.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId: snapshot.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result);
  // 10. Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 10);
  TestValidator.equals("total records", result.pagination.records, 3);
  TestValidator.equals("total pages", result.pagination.pages, 1);
  // 11. Validate image count
  TestValidator.equals("image count", result.data.length, 3);
  // 12. Validate display order ascending
  TestValidator.equals(
    "display_order of first image",
    result.data[0].display_order,
    0,
  );
  TestValidator.equals(
    "display_order of second image",
    result.data[1].display_order,
    1,
  );
  TestValidator.equals(
    "display_order of third image",
    result.data[2].display_order,
    2,
  );
  // 13. Validate originalImage references are populated
  for (const img of result.data) {
    TestValidator.predicate(
      "originalImage is populated",
      img.originalImage !== null,
    );
  }
}
