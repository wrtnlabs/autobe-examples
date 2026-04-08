import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_product_variants_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_product_variants_inventory_records_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test retrieving paginated inventory records for a product variant the seller owns.
 *
 * Steps:
 * 1. Seller registers and logs in
 * 2. Create a product with category
 * 3. Create a product variant with SKU and option values
 * 4. Add inventory records (restock, adjustment) with different reasons
 * 5. Call PATCH inventory records endpoint for the variant
 *
 * Validates:
 * - Response includes paginated list of inventory records
 * - Each record contains id, quantityChange, reason, and createdAt
 * - Records sorted by createdAt descending (most recent first)
 * - Pagination metadata includes page, limit, records, and pages
 */
export async function test_api_inventory_records_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registers and logs in using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product with category using utility function
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a product variant with SKU and option values using utility function
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          quantity: 0,
        },
      },
    );
  typia.assert(variant);
  // 4. Add inventory records (restock, adjustment) with different reasons
  // First restock record
  const restockRecord1 =
    await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          operationType: "restock",
          reason: "Initial restock from supplier",
        },
      },
    );
  typia.assert(restockRecord1);
  // Second restock record
  const restockRecord2 =
    await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
          operationType: "restock",
          reason: "Additional inventory",
        },
      },
    );
  typia.assert(restockRecord2);
  // Adjustment record (negative quantity change)
  const adjustmentRecord =
    await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          operationType: "adjustment",
          reason: "Damaged goods correction",
        },
      },
    );
  typia.assert(adjustmentRecord);
  // 5. Call PATCH inventory records endpoint for the variant
  const response =
    await api.functional.ecommerceMall.seller.productVariants.inventoryRecords.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {} satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(response);
  // Validate response structure has pagination metadata and data array
  TestValidator.equals(
    "has pagination metadata",
    typeof response.pagination,
    "object",
  );
  TestValidator.equals("has data array", Array.isArray(response.data), true);
  TestValidator.predicate("has at least 3 records", response.data.length >= 3);
  // Validate pagination metadata fields - access nested pagination
  const pagination = response.pagination.pagination as IPage.IPagination;
  TestValidator.equals("has current page", typeof pagination.current, "number");
  TestValidator.equals("has limit", typeof pagination.limit, "number");
  TestValidator.equals(
    "has records count",
    typeof pagination.records,
    "number",
  );
  TestValidator.equals("has pages count", typeof pagination.pages, "number");
  TestValidator.predicate(
    "current page is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("limit is at least 1", pagination.limit >= 1);
  TestValidator.predicate(
    "records count matches or exceeds data length",
    pagination.records >= response.data.length,
  );
  // Validate each inventory record has required fields
  for (const record of response.data) {
    TestValidator.equals("record has id", typeof record.id, "string");
    TestValidator.equals(
      "record has quantityChange",
      typeof record.quantityChange,
      "number",
    );
    TestValidator.equals("record has reason", typeof record.reason, "string");
    TestValidator.equals(
      "record has createdAt",
      typeof record.createdAt,
      "string",
    );
  }
  // Validate records are sorted by createdAt descending (most recent first)
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentRecord = response.data[i];
    const nextRecord = response.data[i + 1];
    const currentTime = new Date(currentRecord.createdAt).getTime();
    const nextTime = new Date(nextRecord.createdAt).getTime();
    TestValidator.predicate(
      `record at index ${i} is more recent than record at index ${i + 1}`,
      currentTime >= nextTime,
    );
  }
  // Validate restock records have positive quantityChange
  const restockRecords = response.data.filter((r) =>
    r.reason.includes("restock"),
  );
  if (restockRecords.length > 0) {
    TestValidator.predicate(
      "restock records have positive quantityChange",
      restockRecords.every((r) => r.quantityChange > 0),
    );
  }
  // Validate adjustment records have negative quantityChange
  const adjustmentRecords = response.data.filter((r) =>
    r.reason.includes("Damaged"),
  );
  if (adjustmentRecords.length > 0) {
    TestValidator.predicate(
      "adjustment records have negative quantityChange",
      adjustmentRecords.every((r) => r.quantityChange < 0),
    );
  }
}
