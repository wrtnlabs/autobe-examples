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
 * Test adding a new attribute option to an existing product variant.
 *
 * Validates that an approved seller can extend a product variant's configuration by adding a new attribute key-value pair. The variant must already exist with at least one option. The new option must have a unique attribute key within its parent variant to avoid conflicts. Verifies auto-generated UUID, correct variant linkage, and timestamp population.
 *
 * 1. Administrator creates a product category.
 * 2. Seller registers and authenticates to the platform.
 * 3. Seller creates a product assigned to the category.
 * 4. Seller creates a product variant with initial options (color and size).
 * 5. Seller adds a new unique option (material) to the existing variant.
 * 6. Validates the response option fields and linkage to parent variant.
 */
export async function test_api_product_variant_option_add_new_attribute(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials: IEcommercePlatformSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_seller_join(sellerConnection, { body: sellerCredentials });
  // 3. Seller creates product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  // 4. Seller creates variant with initial options (color, size)
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          options: [
            { attributeKey: "color", attributeValue: "Red" },
            { attributeKey: "size", attributeValue: "Large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 5. Seller adds new option (material: Cotton) to the existing variant
  const body = {
    attributeKey: "material",
    attributeValue: "Cotton",
  } satisfies IEcommercePlatformProductVariantOption.ICreate;
  const newOption =
    await api.functional.ecommercePlatform.seller.products.variants.options.create(
      sellerConnection,
      {
        productId: product.id,
        skuCode: variant.sku_code,
        body,
      },
    );
  typia.assert(newOption);
  // 6. Validate new option
  TestValidator.equals(
    "attribute key matches",
    newOption.attributeKey,
    body.attributeKey,
  );
  TestValidator.equals(
    "attribute value matches",
    newOption.attributeValue,
    body.attributeValue,
  );
  TestValidator.equals(
    "variant sku matches",
    newOption.productVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.predicate(
    "has valid option id",
    /^[0-9a-f-]{36}$/i.test(newOption.id),
  );
  TestValidator.predicate(
    "created at is not empty",
    newOption.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated at is not empty",
    newOption.updatedAt.length > 0,
  );
  TestValidator.equals("not soft deleted", newOption.deletedAt, null);
}
