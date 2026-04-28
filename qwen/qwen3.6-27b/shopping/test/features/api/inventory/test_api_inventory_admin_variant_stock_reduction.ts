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
import { generate_random_ecommerce_platform_admin_products_variants_inventory_adjust } from "../../../generate/generate_random_ecommerce_platform_admin_products_variants_inventory_adjust";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_inventory_record } from "../../../prepare/prepare_random_ecommerce_platform_inventory_record";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test admin inventory stock reduction for a product variant.
 *
 * Validates the complete inventory adjustment workflow including administrative authentication, category creation
 * prerequisite setup, seller authentication and product creation, variant generation, and stock reduction application.
 * Ensures that the negative quantity delta correctly represents damaged goods removal, the immutable ledger
 * entry captures the adjustment accurately, and system auto-populates the creation timestamp on the ledger record.
 *
 * 1. Administrator authenticates via join operation.
 * 2. Administrator creates a product category for product assignment.
 * 3. Seller authenticates via join operation.
 * 4. Seller creates a product assigned to the category.
 * 5. Seller creates a product variant under the product.
 * 6. Administrator applies negative quantity delta (-15) with reason documenting damaged goods removal.
 * 7. Immutable ledger entry is created in ecommerce_platform_inventory_records.
 * 8. Validates inventory record details match input parameters.
 * 9. Transactional integrity ensures record commitment only if variant validation succeeds.
 * 10. System preserves full audit trail of stock reductions for dispute resolution.
 */
export async function test_api_inventory_admin_variant_stock_reduction(
  connection: api.IConnection,
) {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  const category =
    await api.functional.ecommercePlatform.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(5),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  const product = await api.functional.ecommercePlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        category_id: category.id,
      } satisfies IEcommercePlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: typia.random<string & tags.Format<"uuid">>(),
          options: [
            {
              attributeKey: RandomGenerator.alphabets(3),
              attributeValue: RandomGenerator.alphabets(4),
            } satisfies IEcommercePlatformProductVariantOption.ICreate,
          ],
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const inventoryRecord =
    await api.functional.ecommercePlatform.admin.products.variants.inventory.adjust(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity_delta: -15,
          reason: "Damaged goods removal",
        } satisfies IEcommercePlatformInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  TestValidator.equals(
    "quantity delta matches input",
    inventoryRecord.quantity_delta,
    -15,
  );
  TestValidator.equals(
    "reason matches input",
    inventoryRecord.reason,
    "Damaged goods removal",
  );
  TestValidator.predicate(
    "creation timestamp exists",
    inventoryRecord.created_at !== null &&
      inventoryRecord.created_at !== undefined,
  );
}
