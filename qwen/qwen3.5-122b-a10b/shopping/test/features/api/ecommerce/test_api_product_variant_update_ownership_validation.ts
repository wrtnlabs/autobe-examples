import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test that unauthorized sellers cannot update product variants owned by other sellers.
 *
 * Validates the ownership constraint for product variant updates by ensuring that only the seller who owns the parent product can modify its variants. This test creates two separate seller accounts, has the first seller create a product with a variant, then attempts to update that variant using the second seller's credentials.
 *
 * The system must reject unauthorized update attempts to prevent sellers from tampering with other sellers' product inventory and pricing information.
 *
 * 1. First seller registers and authenticates.
 * 2. First seller creates a product.
 * 3. First seller creates a variant for the product.
 * 4. Second seller registers and authenticates separately.
 * 5. Second seller attempts to update the first seller's variant.
 * 6. Validates that the update request is rejected with appropriate error.
 */
export async function test_api_product_variant_update_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. First seller registers and authenticates
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(firstSeller);
  // 2. First seller creates a product
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const firstProduct = await generate_random_ecommerce_seller_products_create(
    firstSellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(firstProduct);
  // 3. First seller creates a variant for the product
  const firstVariant =
    await generate_random_ecommerce_seller_products_variants_create(
      firstSellerConnection,
      {
        body: {
          sku_code: RandomGenerator.alphabets(10).toUpperCase(),
          option_values: `color=${RandomGenerator.alphabets(5)};size=${RandomGenerator.alphabets(3)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
        params: {
          productId: firstProduct.id,
        },
      },
    );
  typia.assert(firstVariant);
  // 4. Second seller registers and authenticates separately
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSeller = await authorize_seller_join(secondSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(secondSeller);
  // 5. Second seller attempts to update the first seller's variant
  // This should fail because the second seller does not own the product
  await TestValidator.error(
    "second seller cannot update first seller's variant",
    async () => {
      await api.functional.ecommerce.seller.products.variants.update(
        secondSellerConnection,
        {
          productId: firstProduct.id,
          variantId: firstVariant.id,
          body: {
            sku_code: RandomGenerator.alphabets(10).toUpperCase(),
            option_values: `color=${RandomGenerator.alphabets(5)};size=${RandomGenerator.alphabets(3)}`,
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          } satisfies IEcommerceProductVariant.IUpdate,
        },
      );
    },
  );
}
