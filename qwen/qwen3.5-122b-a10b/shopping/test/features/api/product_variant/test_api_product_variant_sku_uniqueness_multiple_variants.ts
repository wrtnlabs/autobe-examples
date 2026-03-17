import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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

export async function test_api_product_variant_sku_uniqueness_multiple_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create first variant with SKU 'SHIRT-RED-S'
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "SHIRT-RED-S",
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "S" },
          ],
          price: null,
          stockQuantity: 10,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // 4. Create second variant with SKU 'SHIRT-BLUE-M'
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "SHIRT-BLUE-M",
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "M" },
          ],
          price: null,
          stockQuantity: 15,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // 5. Create third variant with SKU 'SHIRT-RED-L'
  const variant3 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "SHIRT-RED-L",
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "L" },
          ],
          price: null,
          stockQuantity: 8,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant3);
  // 6. Verify each variant has correct option values as key-value object
  TestValidator.equals(
    "variant1 color option",
    variant1.optionValues.color,
    "Red",
  );
  TestValidator.equals("variant1 size option", variant1.optionValues.size, "S");
  TestValidator.equals(
    "variant2 color option",
    variant2.optionValues.color,
    "Blue",
  );
  TestValidator.equals("variant2 size option", variant2.optionValues.size, "M");
  TestValidator.equals(
    "variant3 color option",
    variant3.optionValues.color,
    "Red",
  );
  TestValidator.equals("variant3 size option", variant3.optionValues.size, "L");
  // 7. Verify SKU codes are unique
  TestValidator.notEquals(
    "variant1 and variant2 SKU differ",
    variant1.skuCode,
    variant2.skuCode,
  );
  TestValidator.notEquals(
    "variant1 and variant3 SKU differ",
    variant1.skuCode,
    variant3.skuCode,
  );
  TestValidator.notEquals(
    "variant2 and variant3 SKU differ",
    variant2.skuCode,
    variant3.skuCode,
  );
  // 8. Verify stock quantities match
  TestValidator.equals("variant1 stock quantity", variant1.stockQuantity, 10);
  TestValidator.equals("variant2 stock quantity", variant2.stockQuantity, 15);
  TestValidator.equals("variant3 stock quantity", variant3.stockQuantity, 8);
  // 9. Verify variants belong to the correct product
  TestValidator.equals("variant1 product id", variant1.product.id, product.id);
  TestValidator.equals("variant2 product id", variant2.product.id, product.id);
  TestValidator.equals("variant3 product id", variant3.product.id, product.id);
}
