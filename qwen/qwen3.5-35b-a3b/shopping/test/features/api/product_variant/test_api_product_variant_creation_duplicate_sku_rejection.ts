import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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

export async function test_api_product_variant_creation_duplicate_sku_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Create a product to add variants to
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create first variant with unique SKU code
  const firstVariant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: "TEST-SKU-001",
          option_values: { size: "Large", color: "Blue" } satisfies {
            [key: string]: string;
          },
          stock_quantity: 50 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(firstVariant);
  // 4. Attempt to create second variant with duplicate SKU code
  // This should fail with 409 Conflict or 422 Unprocessable Entity
  await TestValidator.httpError(
    "duplicate SKU code should be rejected",
    [409, 422],
    async () => {
      await api.functional.ecommerceMall.seller.products.variants.create(
        sellerConnection,
        {
          productId: product.id,
          body: {
            sku_code: "TEST-SKU-001", // Same SKU code as first variant
            option_values: { size: "Small", color: "Red" } satisfies {
              [key: string]: string;
            },
            stock_quantity: 100 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
          } satisfies IEcommerceMallProductVariant.ICreate,
        },
      );
    },
  );
  // 5. Verify original variant remains unchanged
  // The product should still have only one variant with the original SKU
  TestValidator.equals(
    "first variant SKU preserved after duplicate rejection",
    firstVariant.sku_code,
    "TEST-SKU-001",
  );
  TestValidator.equals(
    "first variant option_values preserved",
    firstVariant.option_values,
    { size: "Large", color: "Blue" },
  );
  TestValidator.equals(
    "first variant stock_quantity preserved",
    firstVariant.stock_quantity,
    50,
  );
  TestValidator.equals(
    "product variants count unchanged after duplicate rejection",
    product.variants.length,
    0,
  );
}