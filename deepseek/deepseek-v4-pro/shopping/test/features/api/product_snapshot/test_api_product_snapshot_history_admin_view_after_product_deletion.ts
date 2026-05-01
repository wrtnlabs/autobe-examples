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
 * Verify that an administrator can still view the snapshot history of a product
 * after the seller has soft-deleted it.
 *
 * Validates the immutability and preservation rules for product snapshots:
 * snapshots are append-only, never modified or deleted, and remain accessible
 * even after the parent product is removed from the active catalog. The test
 * confirms that snapshot data reflects the product state before each edit
 * rather than the deleted state.
 *
 * 1. Administrator registers and creates a category for product classification.
 * 2. Seller registers, gets approved by the administrator.
 * 3. Seller creates a product with the category as reference.
 * 4. Seller edits the product to generate at least one snapshot.
 * 5. Seller soft-deletes the product from the catalog.
 * 6. Administrator queries the snapshot history of the now-deleted product.
 * 7. Validates snapshot presence, data fidelity (pre-edit values preserved),
 *    and accessibility despite the product's deleted_at being set.
 */
export async function test_api_product_snapshot_history_admin_view_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Create category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. Approve seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 5. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 6. Edit product to generate a snapshot (captures pre-edit state)
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<number & tags.Minimum<1>>(),
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 7. Delete product
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 8. Admin views snapshot history of the deleted product
  const snapshots =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 9. Validate snapshot survival and data fidelity
  TestValidator.predicate(
    "snapshots accessible after product deletion",
    snapshots.data.length > 0,
  );
  TestValidator.predicate(
    "pagination reflects snapshot records",
    snapshots.pagination.records > 0,
  );
  const snapshot = snapshots.data[0];
  TestValidator.predicate("snapshot has valid id", snapshot.id.length > 0);
  TestValidator.equals(
    "snapshot name preserves original pre-edit value",
    snapshot.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot description preserves original pre-edit value",
    snapshot.description,
    product.description,
  );
  TestValidator.equals(
    "snapshot base_price preserves original pre-edit value",
    snapshot.base_price,
    product.base_price,
  );
  TestValidator.predicate(
    "snapshot created_at is set",
    snapshot.created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot category reference is preserved",
    snapshot.category !== null,
  );
  TestValidator.equals(
    "snapshot category matches original category",
    snapshot.category!.name,
    category.name,
  );
}
