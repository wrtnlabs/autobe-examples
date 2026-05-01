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
 * Test that product snapshots survive soft-deletion and remain accessible
 * to the owning seller.
 *
 * Validates the business rule that snapshots are preserved independently
 * of the product lifecycle. When a seller edits a product, a snapshot is
 * automatically created capturing the previous state. When the product is
 * later soft-deleted, these snapshots must remain accessible through the
 * snapshot history endpoint, not return 404.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, creates a product under that category.
 * 3. Seller edits the product, triggering an automatic snapshot of the
 *    original product state (name, description, base_price, category).
 * 4. Seller soft-deletes the product.
 * 5. Seller retrieves the snapshot history for the deleted product.
 * 6. Validates that at least one snapshot exists after deletion, and that
 *    the snapshot content matches the original product state captured at
 *    edit time — confirming immutability and survival of snapshot data.
 */
export async function test_api_product_snapshot_survival_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
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
  // 4. Seller edits product - triggers automatic snapshot of original state
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    shopping_mall_category_id: category.id,
    base_price: product.base_price + 1000,
  } satisfies IShoppingMallProduct.IUpdate;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: updateBody,
    });
  typia.assert(updatedProduct);
  // 5. Seller soft-deletes product
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 6. Retrieve snapshots after deletion
  const snapshotPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // 7. Validate snapshots survive deletion
  TestValidator.predicate(
    "at least one snapshot exists after product deletion",
    snapshotPage.data.length > 0,
  );
  const snapshot = snapshotPage.data[0];
  TestValidator.equals(
    "snapshot name matches original product name",
    snapshot.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot description matches original product description",
    snapshot.description,
    product.description,
  );
  TestValidator.equals(
    "snapshot base_price matches original product base_price",
    snapshot.base_price,
    product.base_price,
  );
  TestValidator.predicate(
    "snapshot category reference is preserved",
    snapshot.category !== null,
  );
  TestValidator.equals(
    "snapshot category id matches original category",
    snapshot.category!.id,
    category.id,
  );
  TestValidator.predicate(
    "snapshot created_at is a valid timestamp",
    snapshot.created_at.length > 0,
  );
  TestValidator.predicate("snapshot has valid id", snapshot.id.length > 0);
}