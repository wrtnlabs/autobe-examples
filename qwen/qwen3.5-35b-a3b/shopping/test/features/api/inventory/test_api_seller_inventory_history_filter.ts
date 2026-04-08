import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_history_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // Generate test UUIDs for product and variant (simulated ownership)
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Test Filter 1: operation_type='RESTOCK'
  const restockFilter: IEcommerceMallInventoryRecord.IRequest = {
    search: "",
    operationType: "RESTOCK",
    limit: 100,
  };
  const restockResult =
    await api.functional.ecommerceMall.seller.products.variants.inventory_history.inventoryHistory(
      sellerConnection,
      {
        productId: productId,
        variantId: variantId,
        body: restockFilter,
      },
    );
  typia.assert(restockResult);
  typia.assert(restockResult.pagination);
  typia.assert(restockResult.data);
  TestValidator.equals(
    "RESTOCK filter structure validated",
    restockResult.pagination.records,
    restockResult.data.length,
  );
  // 3. Test Filter 2: date_range
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 86400000);
  const fourHoursAgo = new Date(now.getTime() - 14400000);
  const dateRangeFilter: IEcommerceMallInventoryRecord.IRequest = {
    search: "",
    fromDate: oneDayAgo.toISOString(),
    toDate: fourHoursAgo.toISOString(),
    limit: 100,
  };
  const dateRangeResult =
    await api.functional.ecommerceMall.seller.products.variants.inventory_history.inventoryHistory(
      sellerConnection,
      {
        productId: productId,
        variantId: variantId,
        body: dateRangeFilter,
      },
    );
  typia.assert(dateRangeResult);
  typia.assert(dateRangeResult.data);
  TestValidator.equals(
    "date range filter structure validated",
    dateRangeResult.pagination.records,
    dateRangeResult.data.length,
  );
  // 4. Test Filter 3: quantity_range (positive quantities only)
  const quantityRangeFilter: IEcommerceMallInventoryRecord.IRequest = {
    search: "",
    minQuantity: 1,
    maxQuantity: 200,
    limit: 100,
  };
  const quantityRangeResult =
    await api.functional.ecommerceMall.seller.products.variants.inventory_history.inventoryHistory(
      sellerConnection,
      {
        productId: productId,
        variantId: variantId,
        body: quantityRangeFilter,
      },
    );
  typia.assert(quantityRangeResult);
  typia.assert(quantityRangeResult.data);
  TestValidator.equals(
    "quantity range filter structure validated",
    quantityRangeResult.pagination.records,
    quantityRangeResult.data.length,
  );
  // 5. Test Filter 4: Combined filters (RESTOCK + quantity range)
  const combinedFilter: IEcommerceMallInventoryRecord.IRequest = {
    search: "",
    operationType: "RESTOCK",
    minQuantity: 50,
    limit: 100,
  };
  const combinedResult =
    await api.functional.ecommerceMall.seller.products.variants.inventory_history.inventoryHistory(
      sellerConnection,
      {
        productId: productId,
        variantId: variantId,
        body: combinedFilter,
      },
    );
  typia.assert(combinedResult);
  typia.assert(combinedResult.data);
  TestValidator.equals(
    "combined filters structure validated",
    combinedResult.pagination.records,
    combinedResult.data.length,
  );
  // 6. Test Empty Results (filter with non-existent operation type)
  const noMatchFilter: IEcommerceMallInventoryRecord.IRequest = {
    search: "",
    operationType: "NON_EXISTENT_TYPE",
    limit: 100,
  };
  const noMatchResult =
    await api.functional.ecommerceMall.seller.products.variants.inventory_history.inventoryHistory(
      sellerConnection,
      {
        productId: productId,
        variantId: variantId,
        body: noMatchFilter,
      },
    );
  typia.assert(noMatchResult);
  typia.assert(noMatchResult.pagination);
  TestValidator.equals(
    "no matching records returns empty array",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination reflects zero records",
    noMatchResult.pagination.records,
    0,
  );
  // 7. Test Pagination metadata accuracy
  const fullPageFilter: IEcommerceMallInventoryRecord.IRequest = {
    search: "",
    limit: 2,
  };
  const fullPageResult =
    await api.functional.ecommerceMall.seller.products.variants.inventory_history.inventoryHistory(
      sellerConnection,
      {
        productId: productId,
        variantId: variantId,
        body: fullPageFilter,
      },
    );
  typia.assert(fullPageResult);
  typia.assert(fullPageResult.pagination);
  TestValidator.equals(
    "pagination shows correct total records",
    fullPageResult.pagination.records,
    fullPageResult.data.length,
  );
  TestValidator.predicate(
    "pagination shows correct pages calculated",
    fullPageResult.pagination.pages >=
      Math.ceil(
        fullPageResult.pagination.records / fullPageResult.pagination.limit,
      ),
  );
  TestValidator.equals(
    "current page is 1",
    fullPageResult.pagination.current,
    1,
  );
  TestValidator.equals("limit is correct", fullPageResult.pagination.limit, 2);
}