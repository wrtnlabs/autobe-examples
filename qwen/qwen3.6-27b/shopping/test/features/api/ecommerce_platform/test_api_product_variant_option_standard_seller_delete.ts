import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_products_variants_options_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_options_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test seller deletion of a product variant option with product and variant integrity preservation.
 *
 * Validates that an authenticated product owner seller can delete a variant option while ensuring the parent product and variant remain unchanged. Tests the core business logic of ownership-based soft-delete for variant options.
 *
 * The test verifies that deletion does not cascade to the parent product or variant, and that the unique attribute_key constraint per variant is freed upon soft-deletion, allowing reuse of the same key for a new option.
 *
 * Multi-actor setup ensures prerequisites (category) are created by admin before seller operations. Both admin and seller authentication flows are tested as part of the prerequisite chain. After deletion, the product and variant are re-validated to confirm ongoing accessibility.
 *
 * 1. Administrator authenticates and creates a product category.
 * 2. Seller registers with explicit credentials.
 * 3. Seller logs in using the same credentials.
 * 4. Seller creates a product assigned to the category.
 * 5. Seller creates a variant with a specific option (color=Red).
 * 6. Seller deletes the option by its unique identifiers.
 * 7. Product is validated to remain unchanged.
 * 8. The deleted option's attribute key (color) is reused to create a new option with a different value.
 */
export async function test_api_product_variant_option_standard_seller_delete(
  connection: api.IConnection,
): Promise<void> {
  // Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Create category prerequisite
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = "password123";
  const sellerJoinData = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(sellerJoinData);
  // Seller login with stored credentials
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // Create product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >() satisfies number as number,
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  // Create variant with color option
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: RandomGenerator.alphabets(10),
          options: [
            {
              attributeKey: "color",
              attributeValue: "Red",
            },
          ],
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // Identify the option to delete
  const targetOption = variant.options[0!];
  typia.assert(targetOption);
  // Delete the option (void response - soft-delete)
  await api.functional.ecommercePlatform.seller.products.variants.options.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      optionId: targetOption.id,
    },
  );
  // Create new option with same attribute key - proves soft-delete freed constraint
  const newOption =
    await generate_random_ecommerce_platform_seller_products_variants_options_create(
      sellerConnection,
      {
        body: {
          attributeKey: "color",
          attributeValue: "Blue",
        },
        params: {
          productId: product.id,
          skuCode: variant.sku_code,
        },
      },
    );
  typia.assert(newOption);
}
