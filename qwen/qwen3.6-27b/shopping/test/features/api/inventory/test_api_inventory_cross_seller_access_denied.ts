import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
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
import { generate_random_ecommerce_platform_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_inventory_record } from "../../../prepare/prepare_random_ecommerce_platform_inventory_record";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test that inventory records are protected from cross-seller access attempts.
 *
 * Validates that only the owner of a product variant can access its inventory records by testing that a different seller attempting to retrieve another seller's inventory record via the GET endpoint is denied access. The test establishes the full ownership chain: seller → seller profile → product → variant → inventory record.
 *
 * Special attention is given to confirming that the authorization check traverses the complete relational hierarchy (sellers → seller_profiles → products → variants) and prevents unauthorized sellers from viewing stock movement audit trails belonging to other sellers on the platform.
 *
 * 1. Administrator registers and creates a product category for product assignment.
 * 2. Seller1 registers their account.
 * 3. Seller1 creates a product with name, description, and category assignment.
 * 4. Seller1 creates a product variant with unique SKU code and option configurations.
 * 5. Seller1 creates an inventory record with positive quantity_delta for stock restocking.
 * 6. Seller2 registers a separate seller account on the platform.
 * 7. Seller2 attempts to retrieve Seller1's inventory record using the path parameters belonging to Seller1's resources.
 * 8. Validates that an HTTP error is thrown, confirming authorization enforcement blocks cross-seller inventory access.
 */
export async function test_api_inventory_cross_seller_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers and creates a product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller1 registers their account
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: { email: seller1Email },
  });
  typia.assert(seller1);
  // 3. Seller1 creates a product in the category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      seller1Connection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  // 4. Seller1 creates a product variant with SKU and options
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Seller1 creates an inventory record with positive quantity_delta
  const inventory =
    await generate_random_ecommerce_platform_seller_products_variants_inventory_create(
      seller1Connection,
      {
        params: { productId: product.id, variantId: variant.id },
      },
    );
  typia.assert(inventory);
  // 6. Seller2 registers a separate seller account
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: { email: seller2Email },
  });
  typia.assert(seller2);
  // 7 & 8. Seller2 attempts to access Seller1's inventory - should be denied
  await TestValidator.httpError(
    "cross-seller inventory access denied",
    403,
    async () =>
      await api.functional.ecommercePlatform.seller.products.variants.inventory.at(
        seller2Connection,
        {
          productId: product.id,
          variantId: variant.id,
          inventoryId: inventory.id,
        },
      ),
  );
}
