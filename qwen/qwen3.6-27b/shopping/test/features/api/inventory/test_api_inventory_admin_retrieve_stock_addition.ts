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
 * Test admin retrieval of a specific inventory ledger record showing positive quantity delta for stock restocking.
 *
 * Validates the administrator's ability to retrieve detailed inventory history for product variants.
 * The test ensures that inventory records representing stock additions (restocking events) are
 * properly accessible and contain all required fields: id, variant reference, quantity_delta,
 * reason, and created_at timestamp.
 *
 * Special attention is given to verifying that the returned record reflects a positive stock
 * adjustment and correctly associates with the product variant hierarchy—the inventory record
 * must link to a valid variant, which in turn belongs to a valid product, which is assigned to
 * a product category.
 *
 * 1. Administrator joins the platform with random credentials\n2. Seller joins the platform with
 * random credentials\n3. Administrator creates a product category\n4. Seller creates a product
 * assigned to the category\n5. Seller creates a product variant with SKU and option
 * configurations\n6. Seller creates an inventory record with positive quantity_delta (restocking
 * event)\n7. Administrator retrieves the specific inventory record using productId, variantId,
 * and inventoryId path parameters\n8. Validates the retrieved inventory record has correct structure
 * and positive quantity_delta value
 */
export async function test_api_inventory_admin_retrieve_stock_addition(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // Step 2: Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: {} });
  // Step 3: Admin creates a product category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      { body: {} },
    );
  typia.assert<IEcommercePlatformCategory>(category);
  // Step 4: Seller creates a product assigned to the category
  const category_id = category.id;
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id,
        },
      },
    );
  typia.assert<IEcommercePlatformProduct>(product);
  // Step 5: Seller creates a product variant with SKU and options
  const productId = product.id;
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId },
        body: {
          options: [
            {
              attributeKey: "color",
              attributeValue: "Red",
            },
          ],
        },
      },
    );
  typia.assert<IEcommercePlatformProductVariant>(variant);
  // Step 6: Seller creates an inventory record for the variant with positive quantity_delta
  const variantId = variant.id;
  const quantity_delta: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >() satisfies number as number;
  const inventory =
    await generate_random_ecommerce_platform_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId, variantId },
        body: {
          quantity_delta,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert<IEcommercePlatformInventoryRecord>(inventory);
  // Step 7: Admin retrieves the specific inventory record
  const inventoryId = inventory.id;
  const retrieved =
    await api.functional.ecommercePlatform.admin.products.variants.inventory.at(
      adminConnection,
      {
        productId,
        variantId,
        inventoryId,
      },
    );
  // Step 8: Validate the retrieved inventory record
  typia.assert<IEcommercePlatformInventoryRecord>(retrieved);
  // Validate business properties: positive quantity_delta for restocking
  TestValidator.equals(
    "retrieved id matches inventory id",
    retrieved.id,
    inventoryId,
  );
  TestValidator.equals(
    "retrieved quantity_delta matches original",
    retrieved.quantity_delta,
    quantity_delta,
  );
  TestValidator.predicate(
    "quantity_delta is positive (restocking)",
    retrieved.quantity_delta > 0,
  );
  TestValidator.equals(
    "retrieved variant matches variant reference",
    retrieved.variant.id,
    variantId,
  );
}
