import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_history_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // 2. Create a product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Create a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Add multiple inventory adjustment records
  const inventoryRecords = await ArrayUtil.asyncRepeat(5, async () => {
    const quantityChange = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<-100> & tags.Maximum<100>
    >();
    const record =
      await generate_random_shopping_mall_seller_variants_inventory_adjust(
        sellerConnection,
        {
          params: { variantId: variant.id },
          body: {
            quantity_change: quantityChange,
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    typia.assert(record);
    return record;
  });
  // 5. Query inventory history
  const history =
    await api.functional.shoppingMall.seller.variants.inventory.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(history);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "total records count",
    history.pagination.records,
    inventoryRecords.length,
  );
  // 7. Validate records are in descending chronological order (newest first)
  const timestamps = history.data.map((record) =>
    new Date(record.createdAt).getTime(),
  );
  const isDescending = timestamps.every((timestamp, index) => {
    if (index === 0) return true;
    return timestamp <= timestamps[index - 1];
  });
  TestValidator.predicate(
    "records are in descending chronological order",
    isDescending,
  );
}
