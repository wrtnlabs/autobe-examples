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
 * Test product snapshot filtering by date range and name.
 *
 * This test verifies the comprehensive filtering and pagination functionality
 * of the product snapshot list endpoint. It creates a seller account, generates
 * multiple product snapshots through edits, and tests various filter combinations.
 */
export async function test_api_product_snapshot_filtering_by_date_range_and_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      shop_name: RandomGenerator.name(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create initial product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Original Product Name Alpha",
        base_price: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<10000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Wait a small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Edit product multiple times to generate snapshots with different names
  const editNames = [
    "Updated Product Beta Version",
    "Modified Product Gamma Test",
    "Changed Product Delta Item",
    "Final Product Epsilon Edition",
  ];
  for (const name of editNames) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const updated = await api.functional.shoppingMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: { name } satisfies IShoppingMallProduct.IUpdate,
      },
    );
    typia.assert(updated);
  }
  // 4. Test basic snapshot retrieval (no filters)
  const allSnapshots =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "should have snapshots from edits",
    allSnapshots.data.length >= editNames.length,
  );
  // 5. Test date range filtering
  const sortedSnapshots = [...allSnapshots.data].sort(
    (a, b) =>
      new Date(a.snapshot_at).getTime() - new Date(b.snapshot_at).getTime(),
  );
  const middleIndex = Math.floor(sortedSnapshots.length / 2);
  const fromSnapshot = sortedSnapshots[middleIndex];
  const toSnapshot = sortedSnapshots[sortedSnapshots.length - 1];
  const dateRangeResult =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          snapshotAtFrom: fromSnapshot.snapshot_at,
          snapshotAtTo: toSnapshot.snapshot_at,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns snapshots within range",
    dateRangeResult.data.every(
      (s) =>
        new Date(s.snapshot_at).getTime() >=
          new Date(fromSnapshot.snapshot_at).getTime() &&
        new Date(s.snapshot_at).getTime() <=
          new Date(toSnapshot.snapshot_at).getTime(),
    ),
  );
  // 6. Test name-based partial match filtering
  const searchName = "Product";
  const nameFilterResult =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: searchName,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(nameFilterResult);
  TestValidator.predicate(
    "name filter returns matching snapshots",
    nameFilterResult.data.every((s) =>
      s.name.toLowerCase().includes(searchName.toLowerCase()),
    ),
  );
  // 7. Test pagination
  const page1Result =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(page1Result);
  const page2Result =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 1 limit",
    page1Result.data.length,
    Math.min(2, allSnapshots.pagination.records),
  );
  TestValidator.predicate(
    "page 1 and page 2 have different data",
    page1Result.data.length === 0 ||
      page2Result.data.length === 0 ||
      page1Result.data[0].id !== page2Result.data[0].id,
  );
  TestValidator.equals(
    "pagination records count",
    page1Result.pagination.records,
    allSnapshots.pagination.records,
  );
  // 8. Test sorting (ascending by snapshot_at)
  const sortedAscResult =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 20,
          sort: "snapshot_at,asc",
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(sortedAscResult);
  for (let i = 1; i < sortedAscResult.data.length; i++) {
    TestValidator.predicate(
      `snapshot ${i} comes after snapshot ${i - 1}`,
      new Date(sortedAscResult.data[i].snapshot_at).getTime() >=
        new Date(sortedAscResult.data[i - 1].snapshot_at).getTime(),
    );
  }
  // 9. Test combined filters (date range + name search + pagination)
  const combinedResult =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          snapshotAtFrom: fromSnapshot.snapshot_at,
          snapshotAtTo: toSnapshot.snapshot_at,
          name: "Product",
          page: 1,
          limit: 5,
          sort: "snapshot_at,desc",
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filter - date range",
    combinedResult.data.every(
      (s) =>
        new Date(s.snapshot_at).getTime() >=
          new Date(fromSnapshot.snapshot_at).getTime() &&
        new Date(s.snapshot_at).getTime() <=
          new Date(toSnapshot.snapshot_at).getTime(),
    ),
  );
  TestValidator.predicate(
    "combined filter - name match",
    combinedResult.data.every((s) => s.name.toLowerCase().includes("product")),
  );
  TestValidator.predicate(
    "combined filter - pagination limit",
    combinedResult.data.length <= 5,
  );
  TestValidator.equals(
    "combined filter - pagination records matches data length",
    combinedResult.pagination.records,
    combinedResult.data.length,
  );
  // 10. Verify pagination metadata accuracy
  TestValidator.predicate(
    "pagination pages calculated correctly",
    combinedResult.pagination.pages ===
      Math.ceil(
        combinedResult.pagination.records / combinedResult.pagination.limit,
      ),
  );
  TestValidator.equals(
    "pagination current page",
    combinedResult.pagination.current,
    1,
  );
}
