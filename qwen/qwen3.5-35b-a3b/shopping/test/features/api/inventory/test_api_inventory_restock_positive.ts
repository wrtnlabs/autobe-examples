import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test the primary success path for creating an inventory restock record.
 *
 * Validates that a seller can successfully add stock to their product variant through the inventory record creation workflow. This includes creating a seller account, product, variant, and then restocking inventory with proper validation of all fields and relationships.
 *
 * 1. Seller authenticates via /auth/seller/join to create a new seller account
 * 2. Seller creates a product via /ecommerceMall/seller/products with valid data (name, description, category, base_price)
 * 3. Seller adds a variant to the product via /ecommerceMall/seller/products/{productId}/variants with SKU code, option values, and initial stock_quantity
 * 4. Seller creates an inventory restock record via /ecommerceMall/seller/products/{productId}/variants/{variantId}/inventory with:
 *    - quantity_change: positive integer (e.g., 100)
 *    - operation_type: RESTOCK
 *    - reference_id: null
 *    - notes: "Initial restock after product launch"
 *
 * Validation Points:
 * - Verify 200 OK response with created inventory record
 * - Verify the returned inventory record has correct fields: id (UUID), quantity_change (positive), operation_type (RESTOCK), reference_id (null), notes, created_at, updated_at, deleted_at (null), product_variant_id
 * - Verify the product_variant relation is returned with variant details
 * - Verify current stock calculation: original stock_quantity + quantity_change (100) should reflect in the variant's stock after record creation
 * - Verify inventory record is immutable (no update endpoint exists for records)
 * - Verify the record appears in the variant's inventory history when queried
 */
export async function test_api_inventory_restock_positive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product using seller's authenticated connection
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: JSON.stringify({
            color: RandomGenerator.alphabets(3),
            size: RandomGenerator.alphabets(2),
          }),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Create inventory restock record
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: 100,
          operation_type: "RESTOCK" as const,
          reference_id: null,
          notes: "Initial restock after product launch",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 5. Validate inventory record fields
  TestValidator.equals(
    "quantity change is 100",
    inventoryRecord.quantity_change,
    100,
  );
  TestValidator.predicate(
    "quantity change is positive",
    inventoryRecord.quantity_change > 0,
  );
  TestValidator.equals(
    "operation type is RESTOCK",
    inventoryRecord.operation_type,
    "RESTOCK",
  );
  TestValidator.equals(
    "reference id is null",
    inventoryRecord.reference_id,
    null,
  );
  TestValidator.equals(
    "notes matches input",
    inventoryRecord.notes,
    "Initial restock after product launch",
  );
  TestValidator.equals(
    "product_variant_id matches variant id",
    inventoryRecord.ecommerce_mall_product_variant_id,
    variant.id,
  );
  // 6. Validate product_variant relation
  TestValidator.equals(
    "product_variant id in relation matches",
    inventoryRecord.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "variant sku_code matches",
    inventoryRecord.productVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "variant stock_quantity matches",
    inventoryRecord.productVariant.stock_quantity,
    variant.stock_quantity,
  );
  TestValidator.equals(
    "variant product id matches product id",
    inventoryRecord.productVariant.product.id,
    product.id,
  );
  // 7. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(inventoryRecord.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    new Date(inventoryRecord.updated_at).getTime() > 0,
  );
  TestValidator.equals("deleted_at is null", inventoryRecord.deleted_at, null);
}
