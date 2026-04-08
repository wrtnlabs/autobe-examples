import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_record_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product listing
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create a product variant with SKU code
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          quantity: 0,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          optionValues: [
            { key: "color", value: "red" },
            { key: "size", value: "large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 4. Add inventory to the variant (restock operation) to create an inventory record
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          operationType: "restock",
          reason: "restock",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Retrieve the inventory overview for the variant
  // Note: The at() endpoint returns IEcommerceMallInventoryRecord (overview type)
  // The inventoryId parameter is required by the API but returns the same overview
  const inventoryOverview =
    await api.functional.ecommerceMall.seller.variants.inventory.at(
      sellerConnection,
      {
        variantId: variant.id,
        inventoryId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(inventoryOverview);
  // 6. Validate response contains inventory overview fields
  TestValidator.predicate(
    "response has recentChanges array",
    Array.isArray(inventoryOverview.recentChanges),
  );
  TestValidator.predicate(
    "response has lowStockVariants array",
    Array.isArray(inventoryOverview.lowStockVariants),
  );
  TestValidator.predicate(
    "total variants count is non-negative",
    inventoryOverview.totalVariantsCount >= 0,
  );
  TestValidator.predicate(
    "total stock quantity is non-negative",
    inventoryOverview.totalStockQuantity >= 0,
  );
  // 7. Verify the inventory record exists in recentChanges by matching the variant SKU and reason
  const matchingRecentChange = inventoryOverview.recentChanges.find(
    (change) =>
      change.variantSku === variant.skuCode && change.reason === "restock",
  );
  TestValidator.predicate(
    "found matching recent change in response",
    matchingRecentChange !== undefined,
  );
  if (matchingRecentChange) {
    TestValidator.predicate(
      "quantity change is positive for restock",
      matchingRecentChange.quantityChange > 0,
    );
    TestValidator.predicate(
      "created_at is valid ISO 8601 format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        matchingRecentChange.createdAt,
      ),
    );
    TestValidator.equals(
      "product name matches",
      matchingRecentChange.productName,
      product.name,
    );
  }
  // 8. Validate stock counts are correct
  TestValidator.predicate(
    "out of stock count is non-negative",
    inventoryOverview.outOfStockCount >= 0,
  );
  TestValidator.predicate(
    "low stock count is non-negative",
    inventoryOverview.lowStockCount >= 0,
  );
  TestValidator.predicate(
    "in stock count is non-negative",
    inventoryOverview.inStockCount >= 0,
  );
  // 9. Verify variant-specific data in lowStockVariants if applicable
  const matchingLowStockVariant = inventoryOverview.lowStockVariants.find(
    (v) => v.skuCode === variant.skuCode,
  );
  TestValidator.predicate(
    "variant found in lowStockVariants if stock is low",
    matchingLowStockVariant !== undefined,
  );
  if (matchingLowStockVariant) {
    TestValidator.equals(
      "variant SKU matches",
      matchingLowStockVariant.skuCode,
      variant.skuCode,
    );
    TestValidator.equals(
      "product name matches",
      matchingLowStockVariant.productName,
      product.name,
    );
    TestValidator.predicate(
      "quantity is non-negative",
      matchingLowStockVariant.quantity >= 0,
    );
  }
}
