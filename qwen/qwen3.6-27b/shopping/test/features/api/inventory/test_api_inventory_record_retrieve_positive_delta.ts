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
 * Validates the inventory record retrieval workflow for positive stock adjustments.
 *
 * This test ensures that a seller can successfully retrieve an immutable inventory ledger entry after creating a product, variant, and a positive stock delta record. It verifies that the system correctly maintains the audit trail by returning the exact quantity delta, reason, and variant reference that were originally created.
 *
 * The workflow validates the complete relationship chain from sellers to products, variants, and finally to specific inventory records. It confirms that authorization is properly enforced, allowing only the originating seller to access their own inventory history.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and authenticates.
 * 3. Seller creates a product assigned to the category.
 * 4. Seller creates a product variant with a unique SKU and option attributes.
 * 5. Seller creates an inventory record with a positive quantity delta representing a restocking event.
 * 6. Seller retrieves the specific inventory record using product, variant, and inventory IDs.
 * 7. Validates that the retrieved record matches the created data, ensuring immutable audit trail integrity.
 */
export async function test_api_inventory_record_retrieve_positive_delta(
  connection: api.IConnection,
) {
  // 1. Administrator setup and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: undefined });
  const category =
    await api.functional.ecommercePlatform.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentEcommercePlatformCategoryId: null,
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  // 2. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: undefined });
  // 3. Product creation
  const product = await api.functional.ecommercePlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<number & tags.Type<"uint32">>(),
        category_id: category.id,
      } satisfies IEcommercePlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Product variant creation
  const variant =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          price: typia.random<number & tags.Type<"uint32">>() satisfies number as number,
          options: [
            {
              attributeKey: RandomGenerator.alphabets(5),
              attributeValue: RandomGenerator.alphabets(5),
            } satisfies IEcommercePlatformProductVariantOption.ICreate,
          ],
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Create inventory record with positive delta
  const quantityDelta = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const inventory =
    await api.functional.ecommercePlatform.seller.products.variants.inventory.create(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity_delta: quantityDelta,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEcommercePlatformInventoryRecord.ICreate,
      },
    );
  typia.assert(inventory);
  // 6. Retrieve inventory record
  const retrievedInventory =
    await api.functional.ecommercePlatform.seller.products.variants.inventory.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        inventoryId: inventory.id,
      },
    );
  typia.assert(retrievedInventory);
  // 7. Validate response against created data
  TestValidator.equals(
    "inventory ID matches",
    retrievedInventory.id,
    inventory.id,
  );
  TestValidator.equals(
    "variant ID matches",
    retrievedInventory.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "quantity delta matches",
    retrievedInventory.quantity_delta,
    quantityDelta,
  );
  TestValidator.equals(
    "reason matches",
    retrievedInventory.reason,
    inventory.reason,
  );
  TestValidator.predicate(
    "quantity delta is positive",
    retrievedInventory.quantity_delta > 0,
  );
}
