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
import { generate_random_ecommerce_products_variants_inventories_create } from "../../../generate/generate_random_ecommerce_products_variants_inventories_create";
import { prepare_random_ecommerce_inventory } from "../../../prepare/prepare_random_ecommerce_inventory";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_inventory_retrieve_single_entry(
  connection: api.IConnection,
): Promise<void> {
  // Verify successful retrieval of a specific inventory log entry for a product variant. This test creates a product, a product variant, and an inventory record with a 'restock' reason (positive quantity change), then retrieves the specific inventory log entry to confirm it shows the correct quantity change, reason, and timestamps with no sensitive data.
  // 1. Create a product using utility function
  const product = await generate_random_ecommerce_products_create(connection, {
    body: {
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      basePrice: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
      categoriesId: typia.random<string & tags.Format<"uuid">>(),
    },
  });
  typia.assert(product);
  // 2. Create a product variant using utility function
  const variant = await generate_random_ecommerce_products_variants_create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphabets(10),
        price: null,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      },
      params: { productId: product.id },
    },
  );
  typia.assert(variant);
  // 3. Create an inventory record with positive quantity change for restock using utility function
  const inventory =
    await generate_random_ecommerce_products_variants_inventories_create(
      connection,
      {
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: "restock",
        },
        params: { productId: product.id, variantId: variant.id },
      },
    );
  typia.assert(inventory);
  // 4. Retrieve the specific inventory entry
  const retrievedInventory =
    await api.functional.ecommerce.products.variants.inventories.at(
      connection,
      {
        productId: product.id,
        variantId: variant.id,
        inventoryId: inventory.id,
      },
    );
  typia.assert(retrievedInventory);
  // 5. Validate the retrieved inventory information
  TestValidator.equals(
    "inventory ID matches",
    retrievedInventory.id,
    inventory.id,
  );
  TestValidator.equals(
    "quantity change matches",
    retrievedInventory.quantity_change,
    inventory.quantity_change,
  );
  TestValidator.equals(
    "reason matches",
    retrievedInventory.reason,
    inventory.reason,
  );
  TestValidator.equals(
    "created_at in correct ISO format",
    new Date(retrievedInventory.created_at).toISOString(),
    retrievedInventory.created_at,
  );
}
