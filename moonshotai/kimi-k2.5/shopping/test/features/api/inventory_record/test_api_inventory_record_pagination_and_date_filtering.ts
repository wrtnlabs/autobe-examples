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
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
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
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test inventory record pagination and date range filtering with combined filters.
 * Validates that the inventory records endpoint correctly handles:
 * 1. Pagination metadata (current page, limit, total records, total pages)
 * 2. Date range filtering (inclusive date boundaries)
 * 3. Quantity direction filtering (positive/negative stock changes)
 * 4. Reason filtering (specific inventory movement reasons)
 * 5. Empty result handling when filters match no records
 */
export async function test_api_inventory_record_pagination_and_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Step 2: Create category prerequisite
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // Step 3 & 4: Seller authentication and product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  // Step 5: Create multiple product variants to generate inventory activity context
  await ArrayUtil.asyncRepeat(3, async () => {
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  });
  // Step 6-9: Query with combined filters and validate pagination metadata
  const now = Date.now();
  const filterRequest = {
    productId: product.id,
    dateRangeFrom: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
    dateRangeTo: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
    quantityDirection: "negative" as const,
    reason: "order_placed",
    page: 1,
    limit: 10,
    sortDirection: "desc" as const,
  } satisfies IEcommerceMallInventoryRecord.IRequest;
  const result =
    await api.functional.ecommerceMall.seller.inventory_records.index(
      sellerConnection,
      { body: filterRequest },
    );
  typia.assert(result);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current matches request",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    result.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length <= limit",
    result.data.length <= result.pagination.limit,
  );
  // Validate returned records match filter criteria
  for (const record of result.data) {
    const recordTime = new Date(record.createdAt).getTime();
    const fromTime = new Date(filterRequest.dateRangeFrom).getTime();
    const toTime = new Date(filterRequest.dateRangeTo).getTime();
    TestValidator.predicate(
      "record within date range",
      recordTime >= fromTime && recordTime <= toTime,
    );
    TestValidator.predicate(
      "quantity change is negative",
      record.quantityChange < 0,
    );
    TestValidator.equals(
      "reason matches filter",
      record.reason,
      "order_placed",
    );
  }
  // Step 10: Test empty results with impossible future date range
  const emptyResult =
    await api.functional.ecommerceMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          ...filterRequest,
          dateRangeFrom: new Date(
            now + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          dateRangeTo: new Date(now + 366 * 24 * 60 * 60 * 1000).toISOString(),
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has 0 records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has 0 pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result empty data array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result preserves current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result preserves limit",
    emptyResult.pagination.limit,
    10,
  );
}
