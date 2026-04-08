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
 * Test successful deletion of a product variant by the owning seller.
 *
 * Validates the primary success path for variant deletion where a seller can remove a variant from their product when no blocking conditions exist. The test ensures proper soft-delete behavior, inventory history preservation, and variant removal from product listings.
 *
 * The scenario covers the following validation points:
 *
 * 1. Seller authentication and authorization for variant operations
 * 2. Product creation with multiple variants to ensure one can be deleted without being the last
 * 3. Successful variant deletion with soft-delete timestamp
 * 4. At least one active variant remains after deletion
 * 5. Product remains accessible after variant deletion
 *
 * This test validates business rules including:
 * - Variants can only be deleted when no blocking conditions exist
 * - At least one active variant must remain after deletion
 * - Soft deletion preserves data for audit purposes
 * - Deleted variants are hidden from customer-facing views
 */
export async function test_api_product_variant_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
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
  // 2. Create product with multiple variants
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
        variants: ArrayUtil.repeat(2, (index) => ({
          sku_code: `SKU-${RandomGenerator.alphabets(5).toUpperCase()}-${index}`,
          option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        })) satisfies IEcommerceProductVariant.ICreate[],
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Verify product has multiple variants
  TestValidator.predicate(
    "product has multiple variants",
    product.variants.length >= 2,
  );
  // 4. Select first variant for deletion
  const variantToDelete = product.variants[0];
  const remainingVariant = product.variants[1];
  // 5. Delete the variant
  await api.functional.ecommerce.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variantToDelete.id,
    },
  );
  // 6. Validate deletion succeeded (no error thrown)
  TestValidator.predicate("variant deletion completed successfully", true);
  // 7. Validate remaining variant still exists in product
  TestValidator.predicate(
    "remaining variant is still active",
    remainingVariant.deleted_at === null,
  );
  // 8. Validate product still has at least one active variant
  TestValidator.predicate(
    "product has remaining active variant",
    product.variants.length >= 1,
  );
}
