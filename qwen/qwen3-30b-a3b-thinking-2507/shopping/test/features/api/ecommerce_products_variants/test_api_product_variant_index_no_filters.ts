import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_product_variant_index_no_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create an actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Create a product using the utility function
  const product = await generate_random_ecommerce_products_create(
    userConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
        categoriesId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  // Get product variants with default filtering
  const variantsResult = await api.functional.ecommerce.products.variants.index(
    userConnection,
    {
      productId: product.id,
      body: {},
    },
  );
  // Validate response structure
  typia.assert(variantsResult);
  // Check all variants are active (stock_quantity > 0)
  for (const variant of variantsResult.data) {
    TestValidator.predicate(
      "Variant stock_quantity > 0",
      variant.stock_quantity > 0,
    );
  }
  // Check SKUs are sorted in ascending order
  for (let i = 0; i < variantsResult.data.length - 1; i++) {
    const currentSku = variantsResult.data[i].sku;
    const nextSku = variantsResult.data[i + 1].sku;
    TestValidator.predicate("SKUs in ascending order", currentSku <= nextSku);
  }
}
