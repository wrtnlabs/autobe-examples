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
import { generate_random_ecommerce_products_variants_inventories_create } from "../../../generate/generate_random_ecommerce_products_variants_inventories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_inventory } from "../../../prepare/prepare_random_ecommerce_inventory";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_inventory_retrieve_with_order_fulfillment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a category
  const category = await api.functional.ecommerce.categories.create(
    connection,
    {
      body: typia.random<IEcommerceCategory.ICreate>(),
    },
  );
  // 2. Create a product linked to the created category
  const product = await api.functional.ecommerce.products.create(connection, {
    body: {
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      basePrice: typia.random<number & tags.Minimum<0.01>>(),
      categoriesId: category.id,
    },
  });
  // 3. Create a product variant for the created product
  const variant = await api.functional.ecommerce.products.variants.create(
    connection,
    {
      productId: product.id,
      body: {
        sku: RandomGenerator.alphaNumeric(10),
        price: null,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  // 4. Create inventory record with negative quantity (order fulfillment)
  const inventory =
    await api.functional.ecommerce.products.variants.inventories.create(
      connection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity_change: -1,
          reason: "order_fulfillment",
        },
      },
    );
  // 5. Retrieve the created inventory record
  const retrievedInventory =
    await api.functional.ecommerce.products.variants.inventories.at(
      connection,
      {
        productId: product.id,
        variantId: variant.id,
        inventoryId: inventory.id,
      },
    );
  // 6. Verify the retrieved inventory
  TestValidator.equals(
    "quantity_change should be negative",
    retrievedInventory.quantity_change,
    -1,
  );
  TestValidator.equals(
    "reason should match order fulfillment",
    retrievedInventory.reason,
    "order_fulfillment",
  );
}
