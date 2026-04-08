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
 * Test product variant SKU uniqueness constraint during update operation.
 *
 * Validates that SKU codes must remain unique within a product scope by attempting to update a variant with an existing SKU code from another variant. This test ensures the system properly rejects duplicate SKU assignments that would cause inventory tracking issues.
 *
 * The test workflow creates a seller account, registers a product, creates two variants with distinct SKU codes, then attempts to update the first variant to use the second variant's SKU code. The system should reject this update due to the composite unique constraint on (product_id, sku_code).
 *
 * 1. Register and authenticate a seller account.
 * 2. Create a product with the authenticated seller.
 * 3. Create first variant with SKU code "SKU-001".
 * 4. Create second variant with SKU code "SKU-002".
 * 5. Attempt to update first variant's SKU to "SKU-002" (duplicate).
 * 6. Validate that the update operation fails with appropriate error.
 */
export async function test_api_product_variant_update_sku_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
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
  // 2. Create a product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create first variant with SKU-001
  const variant1 =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: "SKU-001",
          option_values: "color=Red",
        } satisfies IEcommerceProductVariant.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant1);
  // 4. Create second variant with SKU-002
  const variant2 =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: "SKU-002",
          option_values: "color=Blue",
        } satisfies IEcommerceProductVariant.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant2);
  // 5-6. Attempt to update variant1 with variant2's SKU code and validate failure
  await TestValidator.error("duplicate sku code rejected", async () => {
    await api.functional.ecommerce.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant1.id,
        body: {
          sku_code: variant2.sku_code,
        } satisfies IEcommerceProductVariant.IUpdate,
      },
    );
  });
}
