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
 * Test snapshot image filtering by display order range with inclusive boundary behavior.
 *
 * Validates that an administrator can filter snapshot images within a display order range using the inclusive `display_order_min` and `display_order_max` parameters. The test confirms that the lower bound defaults to 0 when omitted and that the upper bound is strictly inclusive.
 *
 * 1. Administrator and seller accounts are registered; seller is approved.
 * 2. Administrator creates a category; seller creates a product under it.
 * 3. Seller uploads five images (display orders 0–4) to the product.
 * 4. Seller edits the product to trigger a snapshot capturing all five images.
 * 5. Administrator lists snapshots and extracts the most recent snapshot ID.
 * 6. Part 1: Administrator filters snapshot images with display_order_min=1, display_order_max=3. Validates only images with display orders 1, 2, and 3 are returned in ascending order, with pagination records=3 and pages=1.
 * 7. Part 2: Administrator filters with only display_order_max=2. Validates images with display orders 0, 1, and 2 are returned, and pagination records=3.
 */
export async function test_api_product_snapshot_images_display_order_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller with known credentials for later login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: { email: sellerEmail, password: sellerPassword },
  });
  // 3. Administrator approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuthorized.id,
    });
  typia.assert(approvedSeller);
  // 4. Seller login with known credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Administrator creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 6. Seller creates a product under the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  // 7. Seller uploads five images (display orders 0 through 4)
  await ArrayUtil.asyncRepeat(5, async () => {
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  });
  // 8. Seller edits the product to trigger a snapshot capturing all five images
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 9. Administrator lists snapshots to obtain the snapshot ID
  const snapshots =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate(
    "snapshots exist after product edit",
    snapshots.data.length > 0,
  );
  const snapshotId = snapshots.data[0].id;
  // Test Part 1: Filter with display_order_min=1 and display_order_max=3
  const result1 =
    await api.functional.shoppingMall.admin.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          display_order_min: 1,
          display_order_max: 3,
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(result1);
  // Validate only images with display orders 1, 2, and 3 are returned
  TestValidator.equals(
    "filtered image count for range 1-3",
    result1.data.length,
    3,
  );
  TestValidator.equals(
    "display orders are 1, 2, 3 in ascending order",
    result1.data.map((img) => img.display_order),
    [1, 2, 3],
  );
  TestValidator.equals(
    "pagination records for range 1-3",
    result1.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages for range 1-3",
    result1.pagination.pages,
    1,
  );
  // Test Part 2: Filter with only display_order_max=2 (min defaults to 0)
  const result2 =
    await api.functional.shoppingMall.admin.products.snapshots.images.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          display_order_max: 2,
        } satisfies IShoppingMallProductSnapshotImage.IRequest,
      },
    );
  typia.assert(result2);
  // Validate images with display orders 0, 1, and 2 are returned
  TestValidator.equals(
    "filtered image count for max=2",
    result2.data.length,
    3,
  );
  TestValidator.equals(
    "display orders are 0, 1, 2 in ascending order",
    result2.data.map((img) => img.display_order),
    [0, 1, 2],
  );
  TestValidator.equals(
    "pagination records for max=2",
    result2.pagination.records,
    3,
  );
}
