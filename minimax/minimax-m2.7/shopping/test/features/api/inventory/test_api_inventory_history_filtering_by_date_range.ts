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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_history_filtering_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          quantity: 0,
        },
      },
    );
  typia.assert(variant);
  // 4. Create multiple inventory records at different timestamps
  const record1 =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 100,
          operationType: "restock",
          reason: "initial_restock",
        },
      },
    );
  typia.assert(record1);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const record2 =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 50,
          operationType: "restock",
          reason: "second_restock",
        },
      },
    );
  typia.assert(record2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const record3 =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 25,
          operationType: "adjustment",
          reason: "damaged_goods",
        },
      },
    );
  typia.assert(record3);
  // 5. Fetch all records to get their timestamps
  const allRecordsResponse =
    await api.functional.ecommerceMall.seller.variants.inventory.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {} satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allRecordsResponse);
  // Sort records by createdAt ascending
  const sortedRecords = [...allRecordsResponse.data].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const firstRecord = sortedRecords[0];
  const secondRecord = sortedRecords[1];
  const thirdRecord = sortedRecords[2];
  // 6. Test filtering with date range that includes only first two records
  const rangeStart = firstRecord.createdAt;
  const rangeEnd = secondRecord.createdAt;
  const filteredResponse =
    await api.functional.ecommerceMall.seller.variants.inventory.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          fromDate: rangeStart,
          toDate: rangeEnd,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 7. Validate filtered results
  TestValidator.equals(
    "filtered records count should be 2",
    filteredResponse.data.length,
    2,
  );
  TestValidator.equals(
    "pagination total count should be 2",
    filteredResponse.pagination.pagination.records,
    2,
  );
  // Verify the filtered records are within range
  for (const record of filteredResponse.data) {
    const recordTime = record.createdAt;
    const isInRange = recordTime >= rangeStart && recordTime <= rangeEnd;
    TestValidator.predicate(`record should be within date range`, isInRange);
  }
  // 8. Test pagination with limit=1
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.variants.inventory.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 1,
          fromDate: rangeStart,
          toDate: rangeEnd,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated response should have 1 record",
    paginatedResponse.data.length,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 1",
    paginatedResponse.pagination.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination total should still be 2",
    paginatedResponse.pagination.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination pages should be 2",
    paginatedResponse.pagination.pagination.pages,
    2,
  );
  // 9. Test with broader date range including all records
  const allRangeResponse =
    await api.functional.ecommerceMall.seller.variants.inventory.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          fromDate: firstRecord.createdAt,
          toDate: thirdRecord.createdAt,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allRangeResponse);
  TestValidator.equals(
    "all records should be included",
    allRangeResponse.data.length,
    3,
  );
  TestValidator.equals(
    "pagination total count should be 3",
    allRangeResponse.pagination.pagination.records,
    3,
  );
  // 10. Test with reason filter combined with date range
  const reasonFilteredResponse =
    await api.functional.ecommerceMall.seller.variants.inventory.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          reason: "restock",
          fromDate: firstRecord.createdAt,
          toDate: thirdRecord.createdAt,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(reasonFilteredResponse);
  // Only first two records have "restock" in their reason
  TestValidator.equals(
    "reason filter should return only restock records",
    reasonFilteredResponse.data.length,
    2,
  );
  for (const record of reasonFilteredResponse.data) {
    TestValidator.predicate(
      `record should contain restock in reason`,
      record.reason.includes("restock"),
    );
  }
}
