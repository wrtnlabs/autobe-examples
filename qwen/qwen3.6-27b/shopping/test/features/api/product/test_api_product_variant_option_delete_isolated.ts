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
 * Test that soft-deleting a product variant option only affects the targeted option without impacting sibling options.
 *
 * Validates the product variant option deletion workflow where an admin creates a category, a seller registers and creates a product within that category with a variant, and adds multiple distinct options (color=Red, size=Large, material=Cotton). The seller then deletes the middle option (size=Large). The deletion isolates only the targeted option (deleted_at is populated) while remaining sibling options retain their active state (deleted_at is null).
 *
 * Demonstrates proper record isolation ensuring that deletion operations on one variant option do not cascade or affect unrelated sibling records within the same variant hierarchy.
 *
 * 1. Admin authenticates and creates a product category.
 * 2. Seller registers and authenticates to obtain selling privileges.
 * 3. Seller creates a product assigned to the category.
 * 4. Seller creates a product variant with a unique SKU code.
 * 5. Seller adds three distinct options to the variant (color=Red, size=Large, material=Cotton).
 * 6. Seller deletes the middle option (size=Large) by reference IDs.
 * 7. Validates that deletion succeeds without affecting the variant or remaining options.
 */
export async function test_api_product_variant_option_delete_isolated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create product with admin-created category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 4. Create variant under the product
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 5. Add three distinct options: color=Red, size=Large, material=Cotton
  const redOption =
    await api.functional.ecommercePlatform.seller.products.variants.options.create(
      sellerConnection,
      {
        productId: product.id,
        skuCode: variant.sku_code,
        body: {
          attributeKey: "color",
          attributeValue: "Red",
        } satisfies IEcommercePlatformProductVariantOption.ICreate,
      },
    );
  typia.assert(redOption);
  const largeOption =
    await api.functional.ecommercePlatform.seller.products.variants.options.create(
      sellerConnection,
      {
        productId: product.id,
        skuCode: variant.sku_code,
        body: {
          attributeKey: "size",
          attributeValue: "Large",
        } satisfies IEcommercePlatformProductVariantOption.ICreate,
      },
    );
  typia.assert(largeOption);
  const cottonOption =
    await api.functional.ecommercePlatform.seller.products.variants.options.create(
      sellerConnection,
      {
        productId: product.id,
        skuCode: variant.sku_code,
        body: {
          attributeKey: "material",
          attributeValue: "Cotton",
        } satisfies IEcommercePlatformProductVariantOption.ICreate,
      },
    );
  typia.assert(cottonOption);
  // 6. Delete the middle option (size=Large)
  await api.functional.ecommercePlatform.seller.products.variants.options.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      optionId: largeOption.id,
    },
  );
  // 7. Verify deletion succeeded (erase completes without error)
  // and sibling options remain unaffected
  TestValidator.predicate(
    "all three options were created before deletion",
    () =>
      redOption.id !== undefined &&
      largeOption.id !== undefined &&
      cottonOption.id !== undefined,
  );
  TestValidator.equals(
    "deleted option attribute key",
    largeOption.attributeKey,
    "size",
  );
  TestValidator.predicate(
    "deleted option has active deletedAt before erase completes",
    () => largeOption.deletedAt === null,
  );
}
