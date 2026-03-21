import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test retrieving inventory history with variant and date range filters.
 *
 * This E2E test verifies that sellers can query their inventory history
 * with proper filtering by variant ID and date range, along with pagination support.
 *
 * Steps:
 * 1. Authenticate as seller via seller join endpoint
 * 2. Create a product with a variant
 * 3. Add multiple inventory records (restock) to the variant
 * 4. Query inventory history with variantId filter and date range (startDate, endDate)
 * 5. Verify response contains paginated results with pagination metadata
 * 6. Validate each inventory record includes: id, quantity_change, reason, variant summary, created_at
 * 7. Verify records are sorted by created_at DESC (most recent first)
 * 8. Validate variantId filter returns only records for that specific variant
 * 9. Validate date range filter correctly includes/excludes records based on created_at
 * 10. Verify pagination metadata shows correct current page, limit, total records, total pages
 */
export async function test_api_inventory_history_filtered_by_variant_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Add multiple inventory records (restock) to generate history
  const restockQuantity = 50;
  const inventoryRecord1 =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          operation: "restock",
          quantity: restockQuantity,
          reason: "Initial restock",
        },
      },
    );
  typia.assert(inventoryRecord1);
  // Add second inventory record
  const inventoryRecord2 =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          operation: "restock",
          quantity: 30,
          reason: "Additional restock",
        },
      },
    );
  typia.assert(inventoryRecord2);
  // 5. Query inventory history with variantId filter and date range
  const now = new Date();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const endDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const historyResponse =
    await api.functional.ecommerceMall.seller.inventory_history.index(
      sellerConnection,
      {
        body: {
          variantId: variant.id,
          startDate: startDate.toISOString() as any,
          endDate: endDate.toISOString() as any,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 6. Validate response contains paginated results with pagination metadata
  TestValidator.equals(
    "has pagination metadata",
    historyResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(historyResponse.data),
    true,
  );
  TestValidator.predicate(
    "has records count",
    historyResponse.pagination.records >= 2,
  );
  TestValidator.predicate(
    "has pages count",
    historyResponse.pagination.pages >= 1,
  );
  TestValidator.equals(
    "current page is 1",
    historyResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", historyResponse.pagination.limit, 10);
  // 7. Validate each inventory record includes required fields
  for (const record of historyResponse.data) {
    TestValidator.equals("record has id", record.id !== undefined, true);
    TestValidator.equals(
      "record has quantity_change",
      record.quantity_change !== undefined,
      true,
    );
    TestValidator.equals(
      "record has reason",
      record.reason !== undefined,
      true,
    );
    TestValidator.equals(
      "record has variant",
      record.variant !== undefined,
      true,
    );
    TestValidator.equals(
      "record has created_at",
      record.created_at !== undefined,
      true,
    );
    // Validate variant summary has required fields
    TestValidator.equals(
      "variant has id",
      record.variant.id !== undefined,
      true,
    );
    TestValidator.equals(
      "variant has sku_code",
      record.variant.sku_code !== undefined,
      true,
    );
  }
  // 8. Validate variantId filter returns only records for that specific variant
  for (const record of historyResponse.data) {
    TestValidator.equals(
      "variant ID matches filter",
      record.variant.id,
      variant.id,
    );
  }
  // 9. Validate date range filter correctly includes records based on created_at
  const startTime = new Date(startDate).getTime();
  const endTime = new Date(endDate).getTime();
  for (const record of historyResponse.data) {
    const recordTime = new Date(record.created_at).getTime();
    TestValidator.predicate(
      "record within date range",
      recordTime >= startTime && recordTime <= endTime,
    );
  }
  // 10. Verify records are sorted by created_at DESC (most recent first)
  for (let i = 0; i < historyResponse.data.length - 1; i++) {
    const current = new Date(historyResponse.data[i].created_at).getTime();
    const next = new Date(historyResponse.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "records sorted by created_at DESC",
      current >= next,
    );
  }
  // Additional validation: Test without variantId filter to see all records
  const allHistoryResponse =
    await api.functional.ecommerceMall.seller.inventory_history.index(
      sellerConnection,
      {
        body: {
          startDate: startDate.toISOString() as any,
          endDate: endDate.toISOString() as any,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allHistoryResponse);
  TestValidator.predicate(
    "all history has at least 2 records",
    allHistoryResponse.data.length >= 2,
  );
}
