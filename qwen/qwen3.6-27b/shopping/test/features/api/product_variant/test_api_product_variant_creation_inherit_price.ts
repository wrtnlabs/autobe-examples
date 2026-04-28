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
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test product variant creation inheriting the base product price.
 *
 * Validates the complete workflow for a seller creating a product variant
 * that inherits the product's base price when no explicit price override is provided.
 * The test ensures proper initialization of variant stock quantity and inventory
 * ledger upon variant creation.
 *
 * Special attention is given to verifying that omitting the price field causes
 * the variant to inherit from the product's base_price, represented as null
 * in the variant entity response.
 *
 * 1. Administrator authenticates and creates a product category.
 * 2. Seller authenticates and creates a product assigned to the category.
 * 3. Seller creates a variant with a unique SKU and option attributes but omits the price field.
 * 4. Verifies the returned variant has stock_quantity of 0, price is null (inheriting from product base_price), options match input, and SKU matches input.
 */
export async function test_api_product_variant_creation_inherit_price(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller authenticates and creates a product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  // 3. Seller creates a variant omitting the price field to test inheritance
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const variantOptions = [
    {
      attributeKey: "color",
      attributeValue: "Red",
    } satisfies IEcommercePlatformProductVariantOption.ICreate,
    {
      attributeKey: "size",
      attributeValue: "Large",
    } satisfies IEcommercePlatformProductVariantOption.ICreate,
  ];
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode,
          options: variantOptions,
        },
      },
    );
  typia.assert(variant);
  // 4. Validate variant creation with price inheritance
  TestValidator.equals("variant sku matches input", variant.sku_code, skuCode);
  TestValidator.equals(
    "variant stock quantity initialized to 0",
    variant.stock_quantity,
    0,
  );
  TestValidator.equals(
    "variant price is null (inheriting product base price)",
    variant.price,
    null,
  );
  TestValidator.equals(
    "variant options count matches",
    variant.options.length,
    variantOptions.length,
  );
}
