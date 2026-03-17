import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_inventory_record_audit_trail_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller via join
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create category as admin prerequisite for product creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Create product as parent of variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 4. Create variant that will receive inventory record
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          options: [
            { optionName: "Color", optionValue: "Blue" },
            { optionName: "Size", optionValue: "Medium" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies Partial<IEcommerceMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  // 5. Create inventory record with negative quantity change (stock reduction)
  const quantityChange = -15;
  const reason = "Inventory adjustment for damaged items";
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantity: quantityChange,
          reason: reason,
        } satisfies Partial<IEcommerceMallInventoryRecord.ICreate>,
      },
    );
  typia.assert(inventoryRecord);
  // 6. Retrieve the inventory record by recordId and variantId
  const retrievedRecord =
    await api.functional.ecommerceMall.variants.inventory.at(sellerConnection, {
      variantId: variant.id,
      recordId: inventoryRecord.id,
    });
  typia.assert(retrievedRecord);
  // 7. Verify the response includes variant summary with SKU code, option values, and stock information
  TestValidator.equals(
    "record id matches",
    retrievedRecord.id,
    inventoryRecord.id,
  );
  TestValidator.equals(
    "variant id matches",
    retrievedRecord.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "variant skuCode matches",
    retrievedRecord.variant.skuCode,
    variant.skuCode,
  );
  TestValidator.predicate(
    "variant has option values",
    retrievedRecord.variant.options.length > 0,
  );
  TestValidator.predicate(
    "variant currentStock is number",
    typeof retrievedRecord.variant.currentStock === "number",
  );
  TestValidator.predicate(
    "variant isAvailable is boolean",
    typeof retrievedRecord.variant.isAvailable === "boolean",
  );
  // 8. Assert quantityChange and reason match the values provided during creation
  TestValidator.equals(
    "quantityChange matches input",
    retrievedRecord.quantityChange,
    quantityChange,
  );
  TestValidator.equals("reason matches input", retrievedRecord.reason, reason);
  // 9. Confirm createdAt timestamp reflects when the inventory movement occurred
  TestValidator.predicate(
    "createdAt is valid timestamp",
    retrievedRecord.createdAt.length > 0,
  );
  // 10. Validate that negative quantity changes (stock reductions) are properly represented
  TestValidator.predicate(
    "negative quantity change is preserved",
    retrievedRecord.quantityChange < 0,
  );
  // 11. Verify record structure matches IEcommerceMallInventoryRecord schema exactly
  typia.assert(retrievedRecord);
}
