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
import { generate_random_ecommerce_mall_seller_products_variants_options_create_option } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_options_create_option";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_seller_product_variant_option_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller1
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Setup seller2 (different seller)
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Seller1 creates a product (uses random UUID for category_id since no admin APIs)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 4. Seller1 creates a variant for the product
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      seller1Connection,
      {
        body: {
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
          >(),
          options: {
            size: "Large",
            color: "Blue",
          },
        } satisfies Partial<IEcommerceMallProductVariant.ICreate>,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 5. Seller2 attempts to add an option to seller1's variant (unauthorized)
  // Expected: 403 Forbidden - seller2 does not own the product
  await TestValidator.error(
    "seller2 cannot add option to seller1's variant",
    async () => {
      await api.functional.ecommerceMall.seller.products.variants.options.createOption(
        seller2Connection,
        {
          productId: product.id,
          variantId: variant.id,
          body: {
            key: "Material",
            value: "Cotton",
          } satisfies IEcommerceMallProductVariantOption.ICreate,
        },
      );
    },
  );
  // 6. Verify seller1's connection is still valid (product/variant unchanged)
  // Seller1 can still create another variant on their product
  const anotherVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      seller1Connection,
      {
        body: {
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
          >(),
          options: {
            size: "Medium",
            color: "Red",
          },
        } satisfies Partial<IEcommerceMallProductVariant.ICreate>,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(anotherVariant);
  TestValidator.notEquals(
    "another variant created successfully with different ID",
    anotherVariant.id,
    variant.id,
  );
  // 7. Verify seller2 still cannot access seller1's resources
  // Try to create option on the new variant (should still fail)
  await TestValidator.error(
    "seller2 still cannot add option to seller1's new variant",
    async () => {
      await api.functional.ecommerceMall.seller.products.variants.options.createOption(
        seller2Connection,
        {
          productId: product.id,
          variantId: anotherVariant.id,
          body: {
            key: "Color",
            value: "Green",
          } satisfies IEcommerceMallProductVariantOption.ICreate,
        },
      );
    },
  );
}
