import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { generate_random_ecommerce_products_variants_create } from "../../../generate/generate_random_ecommerce_products_variants_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_inventory_zero_stock_handling(
  connection: api.IConnection,
): Promise<void> {
  // Create product
  const product = await generate_random_ecommerce_products_create(connection, {
    body: {
      name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
      description: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 4,
        wordMax: 10,
      }),
      basePrice: typia.random<number & tags.Minimum<1> & tags.Maximum<1000>>(),
      categoriesId: typia.random<string & tags.Format<"uuid">>(),
    },
  });
  // Create product variant with 5 units of stock
  const variant = await generate_random_ecommerce_products_variants_create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphabets(6),
        stock_quantity: 5,
      },
      params: {
        productId: product.id,
      },
    },
  );
  // Fulfill order for 5 units (set inventory to 0)
  const inventoryRecord =
    await api.functional.ecommerce.products.variants.inventories.updateInventory(
      connection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity_change: -5,
          reason: "customer_order",
        } satisfies IEcommerceInventory.IUpdate,
      },
    );
  typia.assert(inventoryRecord);
  // Verify inventory logs
  TestValidator.equals(
    "inventory quantity change should be -5",
    inventoryRecord.quantity_change,
    -5,
  );
  TestValidator.equals(
    "inventory reason should be customer_order",
    inventoryRecord.reason,
    "customer_order",
  );
  // Verify audit timestamps are correctly formatted as ISO 8601
  TestValidator.predicate(
    "created_at should be valid date-time",
    inventoryRecord.created_at.match(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    ) !== null,
  );
  TestValidator.predicate(
    "updated_at should be valid date-time",
    inventoryRecord.updated_at.match(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    ) !== null,
  );
}
