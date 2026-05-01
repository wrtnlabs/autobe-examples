import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that a seller can retrieve a single product snapshot for their own product,
 * verifying the snapshot captures the complete product state as it existed before an edit.
 *
 * Validates the full product snapshot retrieval workflow: an administrator creates
 * a product category, a seller registers and creates a product, then edits the product
 * to trigger automatic snapshot creation. The snapshot is retrieved and validated to
 * confirm it preserves the product's name, description, base price, and category
 * assignment as they existed immediately before the edit was applied.
 *
 * The snapshot response is fully validated by typia.assert() for structural correctness,
 * and business-level assertions confirm that the frozen values in the snapshot match
 * the original pre-edit product state rather than the updated values.
 *
 * 1. Administrator joins and creates a top-level product category.
 * 2. Seller joins and creates a product assigned to that category.
 * 3. Original product field values are saved for later comparison.
 * 4. Seller edits the product (new name, description, base_price), triggering snapshot creation.
 * 5. Snapshot is retrieved and validated: product_id, name, description, base_price all
 *    reflect the pre-edit state, and the category summary is preserved.
 */
export async function test_api_product_snapshot_retrieve_by_owning_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: register and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup: register
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create product under the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  // Save original values before edit — these will be captured in the snapshot
  const originalName = product.name;
  const originalDescription = product.description;
  const originalBasePrice = product.base_price;
  // 4. Edit product to trigger automatic snapshot creation
  const newName = RandomGenerator.paragraph({ sentences: 3 });
  const newDescription = RandomGenerator.content({ paragraphs: 2 });
  const newBasePrice = typia.random<
    number & tags.Minimum<1>
  >() satisfies number as number;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: newName,
        description: newDescription,
        shopping_mall_category_id: category.id,
        base_price: newBasePrice,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 5. Retrieve the snapshot created during the edit
  const snapshot =
    await api.functional.shoppingMall.seller.products.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot content reflects pre-edit state
  TestValidator.equals(
    "snapshot product_id matches the product",
    snapshot.product_id,
    product.id,
  );
  TestValidator.equals(
    "snapshot name is pre-edit value",
    snapshot.name,
    originalName,
  );
  TestValidator.equals(
    "snapshot description is pre-edit value",
    snapshot.description,
    originalDescription,
  );
  TestValidator.equals(
    "snapshot base_price is pre-edit value",
    snapshot.base_price,
    originalBasePrice,
  );
  TestValidator.predicate(
    "snapshot category is assigned",
    snapshot.category !== null,
  );
  if (snapshot.category !== null) {
    TestValidator.equals(
      "snapshot category id matches",
      snapshot.category.id,
      category.id,
    );
  }
}
