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

// Adjust type definitions to match how they're used in the DTOs
// From IEcommerceProduct.ICreate: basePrice: number & tags.Minimum<0.01>
// From IEcommerceProductVariant.ICreate: stock_quantity: number & tags.Type<"int32"> & tags.Minimum<1>
// From IEcommerceInventory.ICreate: quantity_change: number & tags.Type<"int32">
type ProductPrice = number & tags.Minimum<1> & tags.Maximum<1000>;
type VariantPrice = ProductPrice;
type QuantityChange = number & tags.Type<"int32"> & tags.Minimum<-1>;
class TestUtils {
  static generatePrice(rangeStart: number, rangeEnd: number): ProductPrice {
    return typia.random<ProductPrice>();
  }
  static generateQuantity(): number & tags.Type<"int32"> & tags.Minimum<1> {
    return typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
  }
}
export async function test_api_inventory_fulfillment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create category
  const category = await generate_random_ecommerce_categories_create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2) + " Category",
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  // 2. Create product
  const product = await generate_random_ecommerce_products_create(connection, {
    body: {
      categoriesId: category.id,
      name: RandomGenerator.name(2) + " Product",
      description: RandomGenerator.paragraph({ sentences: 1 }),
      basePrice: TestUtils.generatePrice(1, 1000),
    },
  });
  // 3. Create variant
  const variant = await generate_random_ecommerce_products_variants_create(
    connection,
    {
      body: {
        sku: "SKU-" + RandomGenerator.alphaNumeric(6),
        price: TestUtils.generatePrice(1, 1000),
        stock_quantity: TestUtils.generateQuantity(),
      },
      params: {
        productId: product.id,
      },
    },
  );
  // 4. Create inventory record for fulfillment
  const quantityChange = typia.random<QuantityChange>();
  const inventory =
    await generate_random_ecommerce_products_variants_inventories_create(
      connection,
      {
        body: {
          quantity_change: quantityChange,
          reason: "customer_order",
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  // 5. Validate
  typia.assert(inventory);
  TestValidator.equals(
    "inventory quantity change should be negative",
    inventory.quantity_change,
    quantityChange,
  );
  TestValidator.equals(
    "inventory reason should be 'customer_order'",
    inventory.reason,
    "customer_order",
  );
}
