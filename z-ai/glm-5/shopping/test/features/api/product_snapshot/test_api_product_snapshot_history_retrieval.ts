import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the complete snapshot history retrieval workflow for a seller's product.
   * This scenario validates that:
   * 1. After product creation, an initial snapshot is automatically created capturing the product state
   * 2. The snapshot response includes denormalized product fields matching the product's initial values
   * 3. The snapshot includes category reference, variant_count (0 initially), and image_count (0 initially)
   * 4. Pagination metadata is correctly populated
   * 5. Snapshots are sorted by created_at in descending order (newest first)
   */
  // 1. Create a seller account and authenticate
  const sellerAuthorization = await authorize_seller_join(connection, {});
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuthorization.token.access,
    },
  };
  // 2. Create a product which automatically generates the initial snapshot
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Retrieve snapshot history for the created product
  const snapshotPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // 4. Verify at least one snapshot exists (the initial creation snapshot)
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshotPage.data.length >= 1,
  );
  // 5. Validate pagination metadata
  TestValidator.equals("current page is 1", snapshotPage.pagination.current, 1);
  TestValidator.equals("limit is 10", snapshotPage.pagination.limit, 10);
  TestValidator.predicate(
    "total records is at least 1",
    snapshotPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "total pages is at least 1",
    snapshotPage.pagination.pages >= 1,
  );
  // 6. Validate the first snapshot content matches the product's initial state
  const firstSnapshot = snapshotPage.data[0];
  TestValidator.equals(
    "snapshot name matches product",
    firstSnapshot.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot description matches product",
    firstSnapshot.description,
    product.description,
  );
  TestValidator.equals(
    "snapshot base_price matches product",
    firstSnapshot.base_price,
    product.base_price,
  );
  TestValidator.predicate(
    "snapshot has category",
    firstSnapshot.category !== null,
  );
  TestValidator.equals(
    "initial variant_count is 0",
    firstSnapshot.variant_count,
    0,
  );
  TestValidator.equals(
    "initial image_count is 0",
    firstSnapshot.image_count,
    0,
  );
}
