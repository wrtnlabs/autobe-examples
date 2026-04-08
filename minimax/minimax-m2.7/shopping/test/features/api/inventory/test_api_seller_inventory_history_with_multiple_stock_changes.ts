import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test retrieving inventory history for a seller's product variant with multiple stock changes.
 *
 * Validates the inventory management flow for a seller's product variant. An administrator creates
 * a product category, then a seller registers, authenticates, creates a product with a variant,
 * and manages inventory by adding stock (restock) and deducting stock (order placement).
 *
 * The test verifies that:
 * 1. A seller can create products with variants under an approved category
 * 2. Inventory records can be added to track stock changes with positive (restock) and negative (order) quantities
 * 3. The inventory endpoint returns the current inventory state with variant context
 * 4. The current_stock is correctly computed as the sum of all quantity_change values
 * 5. The response includes variant details with sku_code and product_id
 *
 * Workflow:
 * 1. Admin creates a product category
 * 2. Seller registers with join/login flow
 * 3. Seller creates a product under the category
 * 4. Seller creates a product variant with SKU and options
 * 5. Seller adds initial restock inventory (+100 units)
 * 6. Seller adds order deduction inventory (-5 units)
 * 7. Seller retrieves inventory state and validates computed current_stock (+95 units)
 * 8. Response includes variant details matching the created variant
 */
export async function test_api_seller_inventory_history_with_multiple_stock_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers with known password
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuth);
  // Login as seller with the same password used during join
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Seller creates a product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          optionValues: [
            {
              key: "Color",
              value: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
              ] as const),
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Seller adds initial stock (+100 units with restock reason)
  const restockRecord =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantityChange: 100 satisfies number & tags.Type<"int32">,
          reason: "restock",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(restockRecord);
  // 6. Seller adds order deduction (-5 units with order_placement reason)
  const deductionRecord =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantityChange: -5 satisfies number & tags.Type<"int32">,
          reason: "order_placement",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(deductionRecord);
  // 7. Seller retrieves inventory state
  // The endpoint returns IEcommerceMallInventoryRecord.IInvert - a single record with current state
  const inventoryState =
    await api.functional.ecommerceMall.seller.sellers.me.variants.inventory(
      sellerConnection,
      {
        variantId: variant.id,
      },
    );
  typia.assert(inventoryState);
  // 8. Validate the response structure
  // The response should include variant details
  TestValidator.predicate(
    "response includes variant details",
    inventoryState.variant !== undefined,
  );
  // Validate variant details match
  TestValidator.equals(
    "variant has correct sku_code",
    inventoryState.variant.skuCode,
    variant.skuCode,
  );
  TestValidator.equals(
    "variant has correct product_id",
    inventoryState.variant.productId,
    product.id,
  );
  TestValidator.equals(
    "variant has correct id",
    inventoryState.variant.id,
    variant.id,
  );
  // 9. Validate computed current_stock equals sum of all quantity_change values
  // +100 (restock) + (-5) (order deduction) = +95 units
  TestValidator.equals(
    "current_stock equals sum of quantity_change values (+95)",
    inventoryState.currentStock,
    95,
  );
  // 10. Validate the record returned has the expected fields
  TestValidator.predicate("record has id", inventoryState.id !== undefined);
  TestValidator.predicate(
    "record has quantityChange",
    inventoryState.quantityChange !== undefined,
  );
  TestValidator.predicate(
    "record has reason",
    inventoryState.reason !== undefined,
  );
  TestValidator.predicate(
    "record has createdAt timestamp",
    inventoryState.createdAt !== undefined,
  );
  // 11. Validate the record has valid quantityChange value (should be from one of the records)
  const isValidQuantity =
    inventoryState.quantityChange === 100 ||
    inventoryState.quantityChange === -5;
  TestValidator.predicate(
    "quantityChange is from one of the inventory records",
    isValidQuantity,
  );
  // 12. Validate the reason is from one of the inventory records
  const isValidReason =
    inventoryState.reason === "restock" ||
    inventoryState.reason === "order_placement";
  TestValidator.predicate(
    "reason is from one of the inventory records",
    isValidReason,
  );
}
