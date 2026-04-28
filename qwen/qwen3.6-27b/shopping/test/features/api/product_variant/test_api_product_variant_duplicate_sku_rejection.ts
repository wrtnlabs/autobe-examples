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
 * Test business logic enforcing unique SKU code constraints within a product's variants.
 *
 * Validates that a product cannot have two active variants with the same SKU code, ensuring data integrity for inventory tracking and order processing. The system must detect duplicate SKU attempts and reject them with a 409 Conflict error while preserving existing variant data.
 *
 * Special attention is given to verifying that the duplicate SKU detection operates at the product scope level, and that the rejection preserves data integrity of any previously created variants.
 *
 * 1. Administrator authenticates and creates a product category prerequisite for product assignment.
 * 2. Seller authenticates with unique credentials for product and variant creation.
 * 3. Seller creates a product assigned to the previously created category.
 * 4. Seller successfully creates the first variant with a unique SKU code and variant options.
 * 5. Seller attempts to create a second variant using the identical SKU code, which is rejected with a 409 Conflict.
 */
export async function test_api_product_variant_duplicate_sku_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates and creates category prerequisite
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies DeepPartial<IEcommercePlatformSeller.IJoin>,
  });
  // 3. Seller creates product assigned to the category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 4. Seller creates first variant with unique SKU code
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const variantOptions = [
    {
      attributeKey: "color",
      attributeValue: "Red",
    },
  ];
  const firstVariant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { skuCode, options: variantOptions },
      },
    );
  typia.assert(firstVariant);
  TestValidator.equals(
    "SKU code matches input",
    firstVariant.sku_code,
    skuCode,
  );
  // 5. Seller attempts duplicate SKU creation - expect 409 Conflict rejection
  await TestValidator.httpError(
    "duplicate SKU code rejected with 409 Conflict",
    409,
    async () => {
      const duplicateBody = {
        skuCode,
        options: [{ attributeKey: "size", attributeValue: "Large" }],
      } satisfies IEcommercePlatformProductVariant.ICreate;
      await api.functional.ecommercePlatform.seller.products.variants.create(
        sellerConnection,
        {
          productId: product.id,
          body: duplicateBody,
        },
      );
    },
  );
}
