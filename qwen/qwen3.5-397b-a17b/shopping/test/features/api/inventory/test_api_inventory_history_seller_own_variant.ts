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

export async function test_api_inventory_history_seller_own_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
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
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Create multiple inventory records for the variant
  const inventoryRecords: IShoppingMallInventoryRecord[] = [];
  // First restock operation
  const restockRecord1 =
    await generate_random_shopping_mall_seller_inventory_records_create(
      sellerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          reason: "restock",
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(restockRecord1);
  inventoryRecords.push(restockRecord1);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Second restock operation
  const restockRecord2 =
    await generate_random_shopping_mall_seller_inventory_records_create(
      sellerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          reason: "restock",
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(restockRecord2);
  inventoryRecords.push(restockRecord2);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Adjustment operation (negative quantity)
  const adjustmentRecord =
    await generate_random_shopping_mall_seller_inventory_records_create(
      sellerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Maximum<-1> & tags.Minimum<-50>
          >(),
          reason: "adjustment",
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(adjustmentRecord);
  inventoryRecords.push(adjustmentRecord);
  // 5. Call the inventory history endpoint
  const historyResponse =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(historyResponse);
  // 6. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    historyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    historyResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records count",
    historyResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages count",
    historyResponse.pagination.pages,
    1,
  );
  // 7. Verify response contains all 3 inventory records
  TestValidator.equals("data array length", historyResponse.data.length, 3);
  // 8. Verify each record references the correct variant
  for (const record of historyResponse.data) {
    TestValidator.equals(
      "productVariant id matches variant",
      record.productVariant.id,
      variant.id,
    );
    TestValidator.equals(
      "productVariant sku_code matches",
      record.productVariant.sku_code,
      variant.skuCode,
    );
  }
  // 9. Verify records are ordered by created_at descending (newest first)
  const timestamps = historyResponse.data.map((r) =>
    new Date(r.created_at).getTime(),
  );
  for (let i = 1; i < timestamps.length; i++) {
    TestValidator.predicate(
      `record ${i - 1} is newer than or equal to record ${i}`,
      timestamps[i - 1] >= timestamps[i],
    );
  }
  // 10. Verify all created records are present in the response
  const responseRecordIds = historyResponse.data.map((r) => r.id);
  TestValidator.predicate(
    "restockRecord1 is in response",
    responseRecordIds.includes(restockRecord1.id),
  );
  TestValidator.predicate(
    "restockRecord2 is in response",
    responseRecordIds.includes(restockRecord2.id),
  );
  TestValidator.predicate(
    "adjustmentRecord is in response",
    responseRecordIds.includes(adjustmentRecord.id),
  );
}
