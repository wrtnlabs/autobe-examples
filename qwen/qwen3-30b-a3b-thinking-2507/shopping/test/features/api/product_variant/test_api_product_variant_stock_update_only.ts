import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
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

export async function test_api_product_variant_stock_update_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin context for product creation
  const adminConnection: api.IConnection = { host: connection.host };
  // Removed unauthorized login attempt
  // 2. Create product and variant
  const product = await api.functional.ecommerce.products.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0.01>
        >(),
        categoriesId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  const variant = await api.functional.ecommerce.products.variants.create(
    adminConnection,
    {
      productId: product.id,
      body: {
        sku: RandomGenerator.alphaNumeric(10),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0.01>
        >(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(variant);
  // 3. Update stock quantity to 300
  const updatedVariant =
    await api.functional.ecommerce.products.variants.update(adminConnection, {
      productId: product.id,
      variantId: variant.id,
      body: {
        stock_quantity: 300,
      },
    });
  typia.assert(updatedVariant);
  // 4. Verify business logic
  TestValidator.equals("stock quantity", updatedVariant.stock_quantity, 300);
  TestValidator.equals("price unchanged", updatedVariant.price, variant.price);
  TestValidator.notEquals(
    "updated_at changed",
    updatedVariant.updated_at,
    variant.updated_at,
  );
}
