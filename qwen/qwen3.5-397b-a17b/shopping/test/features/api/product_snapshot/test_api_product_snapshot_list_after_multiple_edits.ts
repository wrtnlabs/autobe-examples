import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a seller can retrieve the complete snapshot history of their product after making multiple edits.
 *
 * This test validates:
 * 1. Snapshots are created automatically on each product edit
 * 2. Snapshots preserve historical state accurately
 * 3. Seller can access snapshots of their own products
 * 4. Pagination works correctly for multiple snapshots
 */
export async function test_api_product_snapshot_list_after_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create initial product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Store original values for validation
  const originalName = product.name;
  const originalPrice = product.base_price;
  // 3. First edit - change product name (creates snapshot 1)
  const editedName1 = RandomGenerator.paragraph({ sentences: 2 });
  const productAfterEdit1 =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: editedName1,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(productAfterEdit1);
  TestValidator.equals(
    "name updated after edit 1",
    productAfterEdit1.name,
    editedName1,
  );
  // 4. Second edit - change product description (creates snapshot 2)
  const editedDescription2 = RandomGenerator.content({ paragraphs: 3 });
  const productAfterEdit2 =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        description: editedDescription2,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(productAfterEdit2);
  TestValidator.equals(
    "description updated after edit 2",
    productAfterEdit2.description,
    editedDescription2,
  );
  // 5. Third edit - change base price (creates snapshot 3)
  const editedPrice3 = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const productAfterEdit3 =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        base_price: editedPrice3,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(productAfterEdit3);
  TestValidator.equals(
    "price updated after edit 3",
    productAfterEdit3.base_price,
    editedPrice3,
  );
  // 6. Retrieve snapshots
  const snapshotsResponse =
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
  typia.assert(snapshotsResponse);
  // Validate pagination metadata
  TestValidator.equals("current page", snapshotsResponse.pagination.current, 1);
  TestValidator.equals("limit", snapshotsResponse.pagination.limit, 10);
  TestValidator.equals(
    "total records",
    snapshotsResponse.pagination.records,
    3,
  );
  TestValidator.equals("total pages", snapshotsResponse.pagination.pages, 1);
  // Validate snapshot count
  TestValidator.equals(
    "snapshot data length",
    snapshotsResponse.data.length,
    3,
  );
  // Validate snapshots are sorted by created_at descending (newest first)
  const snapshot1 = snapshotsResponse.data[0]!;
  const snapshot2 = snapshotsResponse.data[1]!;
  const snapshot3 = snapshotsResponse.data[2]!;
  const date1 = new Date(snapshot1.created_at).getTime();
  const date2 = new Date(snapshot2.created_at).getTime();
  const date3 = new Date(snapshot3.created_at).getTime();
  TestValidator.predicate(
    "snapshots sorted by created_at descending",
    date1 >= date2 && date2 >= date3,
  );
  // Validate snapshot names and prices reflect the state at each edit
  // Note: Snapshot 1 (newest) should have the name from edit 1
  TestValidator.equals(
    "snapshot 1 name matches edit 1",
    snapshot1.name,
    editedName1,
  );
  // Validate snapshot 3 (oldest) has original price
  TestValidator.equals(
    "snapshot 3 base_price matches original",
    snapshot3.base_price,
    originalPrice,
  );
}