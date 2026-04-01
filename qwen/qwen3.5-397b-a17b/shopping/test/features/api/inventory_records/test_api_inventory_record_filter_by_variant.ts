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

export async function test_api_inventory_record_filter_by_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create multiple variants for the product
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant2);
  // 4. Create inventory records for variant1 (3 records)
  const inventoryRecords1 = await Promise.all(
    ArrayUtil.repeat(3, async () => {
      const quantityChange = typia.random<number & tags.Type<"int32">>();
      return await generate_random_shopping_mall_seller_inventory_records_create(
        sellerConnection,
        {
          body: {
            product_variant_id: variant1.id,
            quantity_change: quantityChange === 0 ? 10 : quantityChange,
            reason: RandomGenerator.pick(["restock", "adjustment", "loss"]),
          } satisfies IShoppingMallInventoryRecord.ICreate,
        },
      );
    }),
  );
  inventoryRecords1.forEach((record) => typia.assert(record));
  // 5. Create inventory records for variant2 (2 records)
  const inventoryRecords2 = await Promise.all(
    ArrayUtil.repeat(2, async () => {
      const quantityChange = typia.random<number & tags.Type<"int32">>();
      return await generate_random_shopping_mall_seller_inventory_records_create(
        sellerConnection,
        {
          body: {
            product_variant_id: variant2.id,
            quantity_change: quantityChange === 0 ? -5 : quantityChange,
            reason: RandomGenerator.pick(["restock", "adjustment", "loss"]),
          } satisfies IShoppingMallInventoryRecord.ICreate,
        },
      );
    }),
  );
  inventoryRecords2.forEach((record) => typia.assert(record));
  // 6. Query inventory records filtered by variant1
  const filteredByVariant1 =
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
  typia.assert(filteredByVariant1);
  // 7. Validate that only variant1 records are returned
  TestValidator.equals(
    "filtered records count matches variant1 records",
    filteredByVariant1.data.length,
    inventoryRecords1.length,
  );
  filteredByVariant1.data.forEach((record) => {
    TestValidator.equals(
      "all records belong to variant1",
      record.productVariant.id,
      variant1.id,
    );
  });
  // 8. Validate pagination metadata for variant1 filter
  TestValidator.equals(
    "pagination current page",
    filteredByVariant1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records matches variant1 count",
    filteredByVariant1.pagination.records,
    inventoryRecords1.length,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    filteredByVariant1.pagination.pages >= 1,
  );
  // 9. Query inventory records filtered by variant2
  const filteredByVariant2 =
    await api.functional.shoppingMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          productVariantId: variant2.id,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(filteredByVariant2);
  // 10. Validate variant2 filtering
  TestValidator.equals(
    "filtered records count matches variant2 records",
    filteredByVariant2.data.length,
    inventoryRecords2.length,
  );
  filteredByVariant2.data.forEach((record) => {
    TestValidator.equals(
      "all records belong to variant2",
      record.productVariant.id,
      variant2.id,
    );
  });
  // 11. Test filtering by non-existent variant ID (should return empty)
  const fakeVariantId = typia.random<string & tags.Format<"uuid">>();
  const filteredByFakeVariant =
    await api.functional.shoppingMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          productVariantId: fakeVariantId,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(filteredByFakeVariant);
  TestValidator.equals(
    "fake variant returns empty results",
    filteredByFakeVariant.data.length,
    0,
  );
  TestValidator.equals(
    "fake variant pagination records is 0",
    filteredByFakeVariant.pagination.records,
    0,
  );
}
