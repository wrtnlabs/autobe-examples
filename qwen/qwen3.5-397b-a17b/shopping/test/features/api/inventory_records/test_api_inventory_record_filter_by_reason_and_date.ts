import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
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
import { generate_random_shopping_mall_seller_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_inventory_records_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_record_filter_by_reason_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
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
  // 3. Create product variants for inventory operations
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(variant2);
  // 4. Create multiple inventory records with different reasons
  const reasons = ["restock", "adjustment", "order", "cancellation", "refund"];
  const inventoryRecords: IShoppingMallInventoryRecord[] = [];
  for (let i = 0; i < reasons.length; i++) {
    const record =
      await generate_random_shopping_mall_seller_inventory_records_create(
        sellerConnection,
        {
          body: {
            product_variant_id: i % 2 === 0 ? variant1.id : variant2.id,
            quantity_change: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<-100> &
                tags.Maximum<100>
            >(),
            reason: reasons[i],
          } satisfies IShoppingMallInventoryRecord.ICreate,
        },
      );
    typia.assert(record);
    inventoryRecords.push(record);
  }
  // 5. Test filtering by reason code - exact match
  const restockFilter =
    await api.functional.shoppingMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          reason: "restock",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(restockFilter);
  TestValidator.predicate(
    "restock filter returns only restock records",
    restockFilter.data.every((r) => r.reason === "restock"),
  );
  TestValidator.predicate(
    "restock filter has at least one record",
    restockFilter.data.length > 0,
  );
  // 6. Test filtering by different reason
  const orderFilter =
    await api.functional.shoppingMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          reason: "order",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(orderFilter);
  TestValidator.predicate(
    "order filter returns only order records",
    orderFilter.data.every((r) => r.reason === "order"),
  );
  // 7. Test filtering by date range
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const dateRangeFilter =
    await api.functional.shoppingMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: oneHourAgo.toISOString(),
          createdAtTo: oneHourLater.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  TestValidator.predicate(
    "date range filter returns records within range",
    dateRangeFilter.data.every(
      (r) =>
        new Date(r.created_at) >= oneHourAgo &&
        new Date(r.created_at) <= oneHourLater,
    ),
  );
  // 8. Test combined filtering (reason + date range)
  const combinedFilter =
    await api.functional.shoppingMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          reason: "restock",
          createdAtFrom: oneHourAgo.toISOString(),
          createdAtTo: oneHourLater.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter returns only matching reason",
    combinedFilter.data.every((r) => r.reason === "restock"),
  );
  TestValidator.predicate(
    "combined filter returns records within date range",
    combinedFilter.data.every(
      (r) =>
        new Date(r.created_at) >= oneHourAgo &&
        new Date(r.created_at) <= oneHourLater,
    ),
  );
  // 9. Test filtering by non-existent reason returns empty data
  const emptyFilter =
    await api.functional.shoppingMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          reason: "nonexistent_reason_xyz",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(emptyFilter);
  TestValidator.equals(
    "non-existent reason returns empty data",
    emptyFilter.data.length,
    0,
  );
  TestValidator.equals(
    "empty filter has correct pagination",
    emptyFilter.pagination.records,
    0,
  );
  // 10. Test filtering by date range with no records
  const farPast = new Date("2020-01-01T00:00:00Z");
  const farPastEnd = new Date("2020-01-02T00:00:00Z");
  const emptyDateFilter =
    await api.functional.shoppingMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: farPast.toISOString(),
          createdAtTo: farPastEnd.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(emptyDateFilter);
  TestValidator.equals(
    "past date range returns empty data",
    emptyDateFilter.data.length,
    0,
  );
  // 11. Test sorting by created_at DESC
  const allRecords =
    await api.functional.shoppingMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allRecords);
  if (allRecords.data.length > 1) {
    for (let i = 0; i < allRecords.data.length - 1; i++) {
      TestValidator.predicate(
        `records sorted by created_at DESC at index ${i}`,
        new Date(allRecords.data[i].created_at) >=
          new Date(allRecords.data[i + 1].created_at),
      );
    }
  }
  // 12. Test filtering by product variant
  const variant1Filter =
    await api.functional.shoppingMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          productVariantId: variant1.id,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(variant1Filter);
  TestValidator.predicate(
    "variant filter returns only variant1 records",
    variant1Filter.data.every((r) => r.productVariant.id === variant1.id),
  );
  // 13. Test pagination
  const paginatedRecords =
    await api.functional.shoppingMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(paginatedRecords);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedRecords.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedRecords.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedRecords.pagination.limit,
    2,
  );
}
