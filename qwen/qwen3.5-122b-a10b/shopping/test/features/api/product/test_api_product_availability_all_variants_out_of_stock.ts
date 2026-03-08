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

export async function test_api_product_availability_all_variants_out_of_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(sellerAuth);
  // 2. Create product (category_id must be pre-existing, use random UUID)
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 3. Create multiple variants with stock quantity = 0
  const variantCount: number = 3;
  const variants: IEcommerceMallProductVariant[] = await Promise.all(
    Array.from({ length: variantCount }, async (_, index) => {
      const variant: IEcommerceMallProductVariant =
        await generate_random_ecommerce_mall_seller_products_variants_create(
          sellerConnection,
          {
            params: {
              productId: product.id,
            },
            body: {
              skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
              optionValues: [
                {
                  key: "color",
                  value: ["Red", "Blue", "Green"][index],
                },
              ],
              stockQuantity: 0, // All variants out of stock
            },
          },
        );
      typia.assert(variant);
      return variant;
    }),
  );
  // 4. Call availability endpoint
  const availability: IEcommerceMallProduct.IAvailability =
    await api.functional.ecommerceMall.products.availability(connection, {
      productId: product.id,
    });
  typia.assert(availability);
  // 5. Validate availability status
  TestValidator.equals(
    "product should not be available when all variants are out of stock",
    availability.isAvailable,
    false,
  );
  TestValidator.equals(
    "product status should be active",
    availability.status,
    "active",
  );
  TestValidator.equals(
    "product should have variants",
    availability.hasVariants,
    true,
  );
  TestValidator.equals(
    "variant count should match total variants created",
    availability.variantCount,
    variantCount,
  );
  TestValidator.equals(
    "in stock variant count should be zero",
    availability.inStockVariantCount,
    0,
  );
}
