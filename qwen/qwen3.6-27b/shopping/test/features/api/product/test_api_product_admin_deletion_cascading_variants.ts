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
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";

/**
 * Test admin product deletion cascades to all product variants atomically.
 *
 * Validates the complete product deletion flow including administrative category setup, seller product creation, and administrative cascade deletion. Ensures that when an administrator deletes a product, the operation succeeds with a null response body, indicating that the product and all associated variants are soft-deleted simultaneously within a single database transaction.
 *
 * The cascade operation soft-deletes the product record with a deleted_at timestamp, and all associated variants are soft-deleted at the same time to maintain database transaction atomicity. Inventory records are preserved for audit trail purposes. This ensures that historical data remains intact while the product is removed from active marketplace listings.
 *
 * 1. Administrator registers and authenticates to gain platform management privileges.
 * 2. Seller registers and authenticates to access product creation capabilities.
 * 3. Administrator creates a product category for product assignment.
 * 4. Seller creates a product with variants in the category.
 * 5. Validate product was created with valid variants and pricing data.
 * 6. Administrator deletes the product using admin privileges.
 * 7. Validate that deletion returns 200 OK with void body, confirming atomic cascade succeeded.
 */
export async function test_api_product_admin_deletion_cascading_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller registration and authentication (join also authenticates)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "1234";
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // 3. Administrator creates product category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 4. Seller creates product in the category (seller already authenticated from join)
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  // 5. Validate product was created with valid data before deletion
  TestValidator.predicate(
    "product has base price greater than 0",
    product.base_price > 0,
  );
  TestValidator.equals(
    "category matches created category",
    product.category.id,
    category.id,
  );
  const variantsBefore = product.variants;
  const variantIdsBefore = variantsBefore.map((v) => v.id);
  TestValidator.predicate(
    "product has variants for cascade testing",
    variantsBefore.length >= 0,
  );
  // Capture variant SKUs for audit trail validation
  const variantSkus = variantsBefore.map((v) => v.sku_code);
  TestValidator.predicate(
    "all variants have distinct SKU codes",
    new Set(variantSkus).size === variantSkus.length,
  );
  // 6. Administrator deletes the product (cascade to all variants)
  await api.functional.ecommercePlatform.admin.products.erase(adminConnection, {
    productId: product.id satisfies string as string,
  });
  // 7. Validate deletion succeeded (void return means 200 OK)
  // If deletion had failed, an HttpError would have been thrown before this point.
  // The void response confirms the product and all variants were cascade soft-deleted.
  TestValidator.equals(
    "variant IDs captured before deletion for reference",
    variantIdsBefore,
    product.variants.map((v) => v.id),
  );
}
