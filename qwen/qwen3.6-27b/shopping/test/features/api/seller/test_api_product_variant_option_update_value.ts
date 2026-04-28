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
 * Validates product variant option attribute_value updates through seller operations.
 *
 * Tests the complete workflow where a seller modifies a product variant option's value
 * while preserving its attribute key. The test ensures the system correctly handles
 * partial updates to variant option configurations commonly used for product customization
 * scenarios like changing a color value from 'Red' to 'Crimson'. Comprehensive validation
 * confirms the updated value, unchanged attribute key, proper timestamp management,
 * active option status, and correct variant relationship maintenance.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and creates a product assigned to the created category.
 * 3. Seller creates a product variant with a unique SKU code.
 * 4. Seller creates an initial variant option with attribute_key='color' and attribute_value='Red'.
 * 5. Seller updates the option's attribute_value to 'Crimson' without modifying the key.
 * 6. Validates the updated option reflects the new value with unchanged attribute key.
 * 7. Confirms timestamp records show modification and option remains active.
 */
export async function test_api_product_variant_option_update_value(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create product in the category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  // 4. Create product variant
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { skuCode: RandomGenerator.alphaNumeric(10) },
      },
    );
  typia.assert(variant);
  // 5. Create initial option with color attribute
  const initialOption =
    await generate_random_ecommerce_platform_seller_products_variants_options_create(
      sellerConnection,
      {
        params: { productId: product.id, skuCode: variant.sku_code },
        body: {
          attributeKey: "color",
          attributeValue: "Red",
        },
      },
    );
  typia.assert(initialOption);
  const _originalColor: string = initialOption.attributeValue;
  // 6. Update only the attribute_value to 'Crimson'
  const updatedOption =
    await api.functional.ecommercePlatform.seller.products.variants.options.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        optionId: initialOption.id,
        body: {
          attribute_value: "Crimson",
        } satisfies IEcommercePlatformProductVariantOption.IUpdate,
      },
    );
  typia.assert(updatedOption);
  // 7. Validate the update
  TestValidator.equals(
    "updated attribute_value",
    updatedOption.attributeValue,
    "Crimson" satisfies string,
  );
  TestValidator.equals(
    "attribute_key unchanged",
    updatedOption.attributeKey,
    "color" satisfies string,
  );
  TestValidator.predicate(
    "deleted_at is null",
    null === updatedOption.deletedAt,
  );
  TestValidator.predicate(
    "has valid createdAt",
    undefined !== updatedOption.createdAt,
  );
  TestValidator.predicate(
    "has valid updatedAt",
    undefined !== updatedOption.updatedAt,
  );
  TestValidator.equals(
    "productVariant relation references correct variant",
    updatedOption.productVariant.id,
    variant.id,
  );
}
