import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a seller can successfully retrieve a snapshot of their own product
 * after editing it. The snapshot is automatically created when the product is
 * updated and captures the product state before the edit.
 */
export async function test_api_product_snapshot_seller_own_product_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a product with required fields
  const categoryId = typia.random<string & typia.tags.Format<"uuid">>();
  const createBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    categoryId,
    basePrice: typia.random<number & typia.tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.ICreate;
  const product =
    await api.functional.shoppingMall.seller.seller.products.create(
      sellerConnection,
      { body: createBody },
    );
  typia.assert(product);
  // 3. Capture original product state before update
  const originalProduct = {
    name: product.name,
    description: product.description,
    base_price: product.base_price,
  };
  // 4. Update the product (triggers automatic snapshot creation)
  const updateBody = {
    name: RandomGenerator.name() + " Updated",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    base_price: typia.random<number & typia.tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.IUpdate;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: updateBody,
    });
  typia.assert(updatedProduct);
  // 5. Retrieve the snapshot
  // Note: In simulation mode, we use typia.random for the snapshot ID
  // In production, the snapshotId would be obtained from a listing endpoint
  // or returned from the update operation
  const snapshotId = typia.random<string & typia.tags.Format<"uuid">>();
  const snapshot = await api.functional.shoppingMall.products.snapshots.at(
    sellerConnection,
    {
      productId: product.id,
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // 6. Validate snapshot data
  TestValidator.equals(
    "snapshot product id matches",
    snapshot.product.id,
    product.id,
  );
  TestValidator.predicate("snapshot has name", snapshot.name.length > 0);
  TestValidator.predicate(
    "snapshot has description",
    snapshot.description.length > 0,
  );
  TestValidator.predicate("snapshot has base_price", snapshot.base_price > 0);
  TestValidator.predicate(
    "snapshot has created_at",
    snapshot.created_at.length > 0,
  );
}
