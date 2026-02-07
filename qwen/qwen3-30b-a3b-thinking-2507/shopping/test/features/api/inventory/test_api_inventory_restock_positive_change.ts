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

import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { generate_random_ecommerce_products_variants_create } from "../../../generate/generate_random_ecommerce_products_variants_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_inventory_restock_positive_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create category
  const category = await generate_random_ecommerce_categories_create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  // 2. Create product
  const product = await generate_random_ecommerce_products_create(connection, {
    body: {
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      basePrice: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
      categoriesId: category.id,
    },
  });
  // 3. Create product variant with initial stock
  const variant = await generate_random_ecommerce_products_variants_create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphabets(10),
        price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      },
      params: {
        productId: product.id,
      },
    },
  );
  // Current stock before restock
  const initialStock = variant.stock_quantity;
  // 4. Restock 10 units
  const restock =
    await api.functional.ecommerce.products.variants.inventories.updateInventory(
      connection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity_change: 10,
          reason: "restock",
        },
      },
    );
  typia.assert(restock);
  // 5. Verify restock
  TestValidator.equals("restock quantity matches", restock.quantity_change, 10);
  TestValidator.equals("restock reason matches", restock.reason, "restock");
  TestValidator.equals(
    "stock increased after restock",
    restock.variant.stock_quantity,
    initialStock + 10,
  );
}
