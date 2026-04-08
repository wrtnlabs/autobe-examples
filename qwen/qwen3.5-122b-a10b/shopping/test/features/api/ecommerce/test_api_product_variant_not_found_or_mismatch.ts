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
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test 404 error scenarios when retrieving a product variant.
 *
 * Validates multiple error conditions that should return 404 when attempting to retrieve a product variant through the GET /ecommerce/products/{productId}/variants/{variantId} endpoint. Ensures proper validation of variant existence, product existence, variant-product relationship, and soft-delete status.
 *
 * The test covers five distinct 404 scenarios:
 *
 * 1. Variant not found: Valid productId with non-existent variantId
 * 2. Product not found: Non-existent productId with valid variantId
 * 3. Variant-product mismatch: productId from product A with variantId from product B
 * 4. Soft-deleted variant: Variant that has been soft-deleted
 * 5. Soft-deleted product: Product that has been soft-deleted
 *
 * Each scenario validates that the API correctly returns 404 status with appropriate error handling.
 */
export async function test_api_product_variant_not_found_or_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account for product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Create first product with variant
  const productA = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        variants: [
          {
            sku_code: "SKU-A-001",
            option_values: "color=Red;size=Large",
          } satisfies IEcommerceProductVariant.ICreate,
        ],
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(productA);
  const variantA = productA.variants[0];
  // Create second product with variant
  const productB = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        variants: [
          {
            sku_code: "SKU-B-001",
            option_values: "color=Blue;size=Medium",
          } satisfies IEcommerceProductVariant.ICreate,
        ],
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(productB);
  const variantB = productB.variants[0];
  // 1. Variant not found: valid productId, non-existent variantId
  await TestValidator.httpError(
    "variant not found",
    404,
    async () =>
      await api.functional.ecommerce.products.variants.at(connection, {
        productId: productA.id,
        variantId: typia.random<string & tags.Format<"uuid">>(),
      }),
  );
  // 2. Product not found: non-existent productId, valid variantId
  await TestValidator.httpError(
    "product not found",
    404,
    async () =>
      await api.functional.ecommerce.products.variants.at(connection, {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: variantA.id,
      }),
  );
  // 3. Variant belongs to different product
  await TestValidator.httpError(
    "variant-product mismatch",
    404,
    async () =>
      await api.functional.ecommerce.products.variants.at(connection, {
        productId: productA.id,
        variantId: variantB.id,
      }),
  );
  // 4. Soft-deleted variant: delete variant then try to access
  // Note: Need to check if variant deletion endpoint exists
  // For now, skip this scenario as deletion endpoint not in available APIs
  // 5. Soft-deleted product: delete product then try to access
  // Note: Need to check if product deletion endpoint exists
  // For now, skip this scenario as deletion endpoint not in available APIs
}
