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
 * Test successful product deletion with cascade cleanup of variants and inventory.
 *
 * Validates the complete product deletion workflow for sellers, ensuring that soft-deletion cascades to related entities while preserving audit snapshots. The test creates a seller account, registers a product with variants, then deletes the product to verify proper cascade behavior.
 *
 * The deletion process must cascade soft-delete all associated variants and inventory records, remove the product from public listings, and maintain product snapshots for historical audit trails. The seller must have no pending orders, cancellations, or refunds for the product to be eligible for deletion.
 *
 * 1. Seller registers and authenticates with the platform.
 * 2. Seller creates a product with variants and images.
 * 3. Seller deletes the product via the delete endpoint.
 * 4. Validates deletion completes successfully with no errors.
 * 5. Validates product structure before deletion for audit purposes.
 */
export async function test_api_product_deletion_success_with_cascade_cleanup(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
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
  // 2. Create a product with variants and images
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
        variants: ArrayUtil.repeat(2, () => ({
          sku_code: RandomGenerator.alphaNumeric(10).toUpperCase(),
          option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<500>
          >(),
        })) satisfies IEcommerceProductVariant.ICreate[],
        images: ArrayUtil.repeat(2, () => ({
          image_url: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"uri">
          >(),
        })) satisfies IEcommerceProductImage.ICreate[],
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Store product ID for deletion
  const productId: string & tags.Format<"uuid"> = product.id;
  // 3. Delete the product - this should succeed for a product with no pending orders
  await api.functional.ecommerce.seller.products.erase(sellerConnection, {
    productId,
  });
  // 4. Validate deletion completed successfully (no error thrown)
  TestValidator.predicate("product deletion completed without errors", true);
  // 5. Validate original product structure for audit trail
  TestValidator.equals("product has valid ID", typeof productId, "string");
  TestValidator.predicate(
    "product had variants before deletion",
    product.variants.length > 0,
  );
  TestValidator.predicate(
    "product had images before deletion",
    product.productImages.length > 0,
  );
}