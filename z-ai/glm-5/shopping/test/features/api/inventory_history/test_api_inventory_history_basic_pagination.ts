import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test inventory history pagination for product variants.
 *
 * Validates that administrators can view complete inventory history
 * for product variants across all sellers with proper pagination.
 */
export async function test_api_inventory_history_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create category (administrator action)
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  // 4. Create product (seller action)
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          categoryId: category.id,
          basePrice: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        },
      },
    );
  // 5. Create product variant (seller action)
  const colors = ["Red", "Blue", "Green", "Black"] as const;
  const sizes = ["S", "M", "L", "XL"] as const;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          option_values: {
            color: RandomGenerator.pick(colors),
            size: RandomGenerator.pick(sizes),
          },
          price: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        },
      },
    );
  // 6. Create multiple inventory records to build history
  const inventoryRecords = await ArrayUtil.asyncRepeat(5, async (index) => {
    const quantityChange = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >();
    return generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: quantityChange,
          reason: `Inventory adjustment ${index + 1}: Restocking`,
        },
      },
    );
  });
  // 7. Call inventory history endpoint as administrator with basic pagination
  const historyResponse =
    await api.functional.shoppingMall.administrator.variants.inventory.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 8. Validate pagination metadata
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
    inventoryRecords.length,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    historyResponse.pagination.pages >= 1,
  );
  // 9. Validate all inventory records are returned
  TestValidator.equals(
    "all inventory records returned",
    historyResponse.data.length,
    inventoryRecords.length,
  );
  // 10. Validate each record has required fields and sourceType is 'manual'
  historyResponse.data.forEach((record, index) => {
    TestValidator.equals(
      `record ${index} sourceType is manual`,
      record.sourceType,
      "manual",
    );
  });
  // 11. Validate records are ordered by createdAt descending
  for (let i = 0; i < historyResponse.data.length - 1; i++) {
    const current = new Date(historyResponse.data[i].createdAt).getTime();
    const next = new Date(historyResponse.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `records ordered by createdAt descending at index ${i}`,
      current >= next,
    );
  }
  // 12. Validate variant summary has required fields
  if (historyResponse.data.length > 0) {
    const recordVariant = historyResponse.data[0].variant;
    TestValidator.predicate(
      "variant has valid id",
      recordVariant.id.length > 0,
    );
    TestValidator.predicate(
      "variant has valid skuCode",
      recordVariant.skuCode.length > 0,
    );
    TestValidator.predicate(
      "variant has valid stockQuantity",
      recordVariant.stockQuantity >= 0,
    );
    TestValidator.equals("variant id matches", recordVariant.id, variant.id);
  }
}
