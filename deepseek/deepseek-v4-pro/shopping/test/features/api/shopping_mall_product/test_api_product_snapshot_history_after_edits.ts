import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test product snapshot history retrieval after editing a product.
 *
 * Validates that editing a product's name and description triggers automatic
 * snapshot creation and that the paginated snapshot history correctly reflects
 * the frozen pre-edit state. The test ensures the snapshot system provides
 * a reliable audit trail of product changes.
 *
 * 1. Administrator joins and creates a category for product classification.
 * 2. Seller joins and creates a product under the created category.
 * 3. The original product state (name, description, base_price, category) is saved.
 * 4. Seller edits the product with new name and description.
 * 5. Seller retrieves the paginated snapshot history.
 * 6. Validates pagination structure, snapshot content matching original state,
 *    category reference integrity, and descending chronological ordering.
 */
export async function test_api_product_snapshot_history_after_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  const originalName = product.name;
  const originalDescription = product.description;
  const originalBasePrice = product.base_price;
  const originalCategoryId = product.category.id;
  // 4. Edit product to trigger snapshot
  const newName = RandomGenerator.paragraph({ sentences: 2 });
  const newDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: newName,
        description: newDescription,
        shopping_mall_category_id: category.id,
        base_price: originalBasePrice,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 5. Retrieve snapshot history
  const snapshots =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Validate
  TestValidator.predicate(
    "has at least one snapshot",
    snapshots.data.length >= 1,
  );
  const firstSnapshot = snapshots.data[0];
  TestValidator.equals(
    "snapshot name matches original",
    firstSnapshot.name,
    originalName,
  );
  TestValidator.equals(
    "snapshot description matches original",
    firstSnapshot.description,
    originalDescription,
  );
  TestValidator.equals(
    "snapshot base_price matches original",
    firstSnapshot.base_price,
    originalBasePrice,
  );
  TestValidator.predicate(
    "snapshot category is non-null",
    firstSnapshot.category !== null,
  );
  if (firstSnapshot.category !== null) {
    TestValidator.equals(
      "snapshot category id matches",
      firstSnapshot.category.id,
      originalCategoryId,
    );
  }
  // Pagination validation
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    snapshots.pagination.records,
    snapshots.data.length,
  );
  TestValidator.predicate(
    "pagination records at least 1",
    snapshots.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages at least 1",
    snapshots.pagination.pages >= 1,
  );
  // Verify ordering: newest first (descending by created_at)
  if (snapshots.data.length >= 2) {
    TestValidator.predicate(
      "snapshots ordered by created_at descending",
      () => {
        for (let i = 1; i < snapshots.data.length; i++) {
          if (
            new Date(snapshots.data[i - 1].created_at) <
            new Date(snapshots.data[i].created_at)
          ) {
            return false;
          }
        }
        return true;
      },
    );
  }
}
