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

export async function test_api_inventory_record_seller_view_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
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
      },
    },
  );
  typia.assert(product);
  // 3. Create product variants for inventory tracking
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: null,
          option_value_ids: [],
        },
        params: {
          productId: product.id,
        },
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
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant2);
  // 4. Create multiple inventory records for variant1
  const restockRecords: IShoppingMallInventoryRecord[] = [];
  const restockAmounts = [100, 50, 75, 25, 200];
  for (let i = 0; i < restockAmounts.length; i++) {
    const record =
      await generate_random_shopping_mall_seller_inventory_records_create(
        sellerConnection,
        {
          body: {
            product_variant_id: variant1.id,
            quantity_change: restockAmounts[i],
            reason: "restock",
          },
        },
      );
    typia.assert(record);
    restockRecords.push(record);
  }
  // Create some records for variant2 to test filtering
  const variant2Record =
    await generate_random_shopping_mall_seller_inventory_records_create(
      sellerConnection,
      {
        body: {
          product_variant_id: variant2.id,
          quantity_change: 150,
          reason: "restock",
        },
      },
    );
  typia.assert(variant2Record);
  // 5. Retrieve inventory records with pagination (page 1, limit 3)
  const page1 =
    await api.functional.shoppingMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 3,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 3);
  TestValidator.predicate("page 1 has records", page1.pagination.records >= 6);
  TestValidator.predicate("page 1 has pages", page1.pagination.pages >= 2);
  TestValidator.equals("page 1 data length", page1.data.length, 3);
  // 6. Retrieve page 2
  const page2 =
    await api.functional.shoppingMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 3,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 3);
  TestValidator.equals("page 2 data length", page2.data.length, 3);
  // 7. Validate records are sorted by created_at DESC (newest first)
  const allRecords = [...page1.data, ...page2.data];
  for (let i = 1; i < allRecords.length; i++) {
    TestValidator.predicate(
      `record ${i} is older than record ${i - 1}`,
      new Date(allRecords[i].created_at).getTime() <=
        new Date(allRecords[i - 1].created_at).getTime(),
    );
  }
  // 8. Validate each record structure
  for (const record of allRecords) {
    TestValidator.predicate("record has valid id", record.id.length > 0);
    TestValidator.predicate(
      "quantity_change is integer",
      Number.isInteger(record.quantity_change),
    );
    TestValidator.predicate("reason is not empty", record.reason.length > 0);
    TestValidator.predicate(
      "created_at is valid date",
      new Date(record.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      "productVariant exists",
      record.productVariant !== undefined,
    );
    TestValidator.predicate(
      "productVariant has sku_code",
      record.productVariant.sku_code.length > 0,
    );
  }
  // 9. Filter by variant1 and verify only variant1 records are returned
  const variant1Records =
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
  typia.assert(variant1Records);
  TestValidator.predicate(
    "all records belong to variant1",
    variant1Records.data.every((r) => r.productVariant.id === variant1.id),
  );
  TestValidator.equals(
    "variant1 record count",
    variant1Records.data.length,
    restockRecords.length,
  );
  // 10. Filter by reason and verify only matching records
  const restockOnlyRecords =
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
  typia.assert(restockOnlyRecords);
  TestValidator.predicate(
    "all records have restock reason",
    restockOnlyRecords.data.every((r) => r.reason === "restock"),
  );
  // 11. Verify quantity_change values are positive for restocks
  for (const record of restockOnlyRecords.data) {
    TestValidator.predicate(
      "restock quantity is positive",
      record.quantity_change > 0,
    );
  }
}
