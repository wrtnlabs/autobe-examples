import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_variant_options_mixed_batch_operations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Create a product for the seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant with initial options (color: Red, size: Large)
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          options: { color: "Red", size: "Large" },
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 4. Perform mixed batch operations:
  // - Update 'color' from 'Red' to 'Green'
  // - Remove 'size'
  // - Add 'material' -> 'Cotton'
  // - Add 'style' -> 'Casual'
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.options.updateOptions(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          operations: [
            { action: "update", key: "color", value: "Green" },
            { action: "remove", key: "size" },
            { action: "add", key: "material", value: "Cotton" },
            { action: "add", key: "style", value: "Casual" },
          ],
        },
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate response
  TestValidator.equals(
    "color updated to Green",
    updatedVariant.options.color,
    "Green",
  );
  TestValidator.equals(
    "material added",
    updatedVariant.options.material,
    "Cotton",
  );
  TestValidator.equals("style added", updatedVariant.options.style, "Casual");
  // Verify size was removed (should not exist)
  const hasSize = "size" in updatedVariant.options;
  TestValidator.predicate("size option removed", !hasSize);
  // 6. Verify original options count and final options count
  // Initial: color, size (2 options)
  // Final: color (updated), material, style (3 options)
  const initialOptionsCount = 2;
  const finalOptionsCount = 3;
  TestValidator.notEquals(
    "option count changed",
    Object.keys(variant.options).length,
    finalOptionsCount,
  );
  TestValidator.equals(
    "final options count",
    Object.keys(updatedVariant.options).length,
    finalOptionsCount,
  );
}
