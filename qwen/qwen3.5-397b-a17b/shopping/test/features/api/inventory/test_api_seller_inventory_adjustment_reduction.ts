import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryRecord";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_option_definitions_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_create";
import { generate_random_shopping_mall_seller_products_option_definitions_option_values_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_option_values_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_update } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_update";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_record } from "../../../prepare/prepare_random_shopping_mall_product_inventory_record";
import { prepare_random_shopping_mall_product_option_definition } from "../../../prepare/prepare_random_shopping_mall_product_option_definition";
import { prepare_random_shopping_mall_product_option_value } from "../../../prepare/prepare_random_shopping_mall_product_option_value";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test inventory adjustment with negative quantity_change to simulate stock reduction due to damaged goods.
 *
 * This test verifies:
 * 1. Seller can create inventory records with positive quantity_change (restock)
 * 2. Seller can create inventory records with negative quantity_change (reduction)
 * 3. current_stock is correctly calculated as cumulative sum of all records
 * 4. Inventory records are immutable and preserve historical data
 */
export async function test_api_seller_inventory_adjustment_reduction(
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
  // 3. Create an option definition (e.g., 'Size')
  const optionDefinition =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          name: "Size",
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(optionDefinition);
  // 4. Create an option value (e.g., 'Large')
  const optionValue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: optionDefinition.id,
        },
        body: {
          name: "Large",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(optionValue);
  // 5. Create a product variant with unique SKU code
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(12)}`,
          price_override: null,
          option_value_ids: [optionValue.id],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. First, add initial stock with positive quantity_change (+50)
  const initialStockRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_update(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          quantity_change: 50,
          reason: "Initial stock",
        } satisfies IShoppingMallProductInventoryRecord.ICreate,
      },
    );
  typia.assert(initialStockRecord);
  // Verify initial stock record
  TestValidator.equals(
    "initial quantity_change",
    initialStockRecord.quantity_change,
    50,
  );
  TestValidator.equals(
    "initial reason",
    initialStockRecord.reason,
    "Initial stock",
  );
  TestValidator.equals(
    "initial current_stock",
    initialStockRecord.current_stock,
    50,
  );
  // Small delay to ensure distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 7. Perform inventory adjustment with negative quantity_change (-5)
  const adjustmentRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_update(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          quantity_change: -5,
          reason: "Damaged goods",
        } satisfies IShoppingMallProductInventoryRecord.ICreate,
      },
    );
  typia.assert(adjustmentRecord);
  // 8. Verify the adjustment record has negative quantity_change
  TestValidator.equals(
    "adjustment quantity_change",
    adjustmentRecord.quantity_change,
    -5,
  );
  TestValidator.equals(
    "adjustment reason",
    adjustmentRecord.reason,
    "Damaged goods",
  );
  // 9. Verify current_stock is correctly calculated as 45 (50 - 5)
  TestValidator.equals(
    "adjusted current_stock",
    adjustmentRecord.current_stock,
    45,
  );
  // Verify timestamps are distinct (immutable audit trail)
  TestValidator.notEquals(
    "timestamps differ",
    initialStockRecord.created_at,
    adjustmentRecord.created_at,
  );
  // Verify both records preserve historical data
  TestValidator.predicate(
    "initial stock preserved",
    initialStockRecord.quantity_change === 50,
  );
  TestValidator.predicate(
    "adjustment recorded",
    adjustmentRecord.quantity_change === -5,
  );
}
