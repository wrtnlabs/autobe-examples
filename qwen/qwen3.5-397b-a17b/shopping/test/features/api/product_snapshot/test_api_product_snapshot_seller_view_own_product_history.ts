import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
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

/**
 * Test that a seller can successfully retrieve the snapshot history of their own product.
 *
 * This test verifies:
 * 1. Seller registration and authentication
 * 2. Product creation with initial details
 * 3. Multiple product edits generating snapshots (each edit creates one snapshot)
 * 4. Snapshot list retrieval with correct count and ordering
 * 5. Validation of snapshot fields (id, name, base_price, snapshot_at, category, seller)
 * 6. Pagination metadata correctness
 * 7. Chronological ordering (newest first by snapshot_at)
 */
export async function test_api_product_snapshot_seller_view_own_product_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create initial product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Edit the product multiple times to generate snapshots
  const editCount = 3;
  for (let i = 0; i < editCount; i++) {
    const updateBody: IShoppingMallProduct.IUpdate = {
      name: `${RandomGenerator.paragraph({ sentences: 1 })} - Edit ${i + 1}`,
      description: RandomGenerator.content({ paragraphs: 1 }),
      basePrice: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000>
      >(),
    };
    const updatedProduct =
      await api.functional.shoppingMall.seller.products.update(
        sellerConnection,
        {
          productId: product.id,
          body: updateBody,
        },
      );
    typia.assert(updatedProduct);
  }
  // 4. Retrieve snapshot history
  const snapshotResponse =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 20,
          sort: "snapshot_at,desc",
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 5. Verify pagination metadata
  TestValidator.equals("current page", snapshotResponse.pagination.current, 1);
  TestValidator.equals("limit", snapshotResponse.pagination.limit, 20);
  TestValidator.equals(
    "total records",
    snapshotResponse.pagination.records,
    editCount,
  );
  TestValidator.equals("total pages", snapshotResponse.pagination.pages, 1);
  // 6. Verify snapshot count matches edit count
  TestValidator.equals(
    "snapshot count matches edits",
    snapshotResponse.data.length,
    editCount,
  );
  // 7. Validate each snapshot structure and seller ownership
  for (let i = 0; i < snapshotResponse.data.length; i++) {
    const snapshot = snapshotResponse.data[i];
    // typia.assert validates complete snapshot structure including all required fields
    typia.assert(snapshot);
    // Verify seller ownership (business logic validation, not type validation)
    TestValidator.equals(
      `snapshot ${i + 1} seller matches authenticated seller`,
      snapshot.seller.id,
      sellerAuth.id,
    );
  }
  // 8. Verify chronological ordering (newest first by snapshot_at)
  for (let i = 1; i < snapshotResponse.data.length; i++) {
    const prevSnapshot = snapshotResponse.data[i - 1];
    const currSnapshot = snapshotResponse.data[i];
    TestValidator.predicate(
      `snapshots[${i - 1}].snapshot_at >= snapshots[${i}].snapshot_at`,
      new Date(prevSnapshot.snapshot_at).getTime() >=
        new Date(currSnapshot.snapshot_at).getTime(),
    );
  }
}
