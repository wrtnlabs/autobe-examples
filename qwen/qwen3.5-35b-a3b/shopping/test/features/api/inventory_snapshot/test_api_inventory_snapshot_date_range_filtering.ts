import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventorySnapshot";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventorySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_inventory_records_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";

export async function test_api_inventory_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create seller connection for subsequent API calls
  const sellerAuthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: seller.token.access },
  };
  // 2. Create inventory records at different times
  const baseTime = new Date();
  const timeSlots = ArrayUtil.repeat(5, (i) => {
    // Create records spanning 24+ hours
    return new Date(baseTime.getTime() + i * 6 * 60 * 60 * 1000); // Every 6 hours
  });
  const inventoryRecords: IEcommerceMallInventoryRecord[] = [];
  for (const _ of timeSlots) {
    // Create inventory record with explicit timestamp context
    const record =
      await generate_random_ecommerce_mall_seller_inventory_records_create(
        sellerAuthorizedConnection,
        {
          body: {
            ecommerce_mall_product_variant_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            quantity_change: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            reason: RandomGenerator.alphabets(10),
            type: "INCOMING",
          } satisfies IEcommerceMallInventoryRecord.ICreate,
        },
      );
    typia.assert(record);
    inventoryRecords.push(record);
  }
  // 3. Query snapshots with date range filters
  const startDate = new Date(baseTime.getTime() + 12 * 60 * 60 * 1000); // Middle of range
  const endDate = new Date(baseTime.getTime() + 18 * 60 * 60 * 1000); // Later in range
  // Test 1: Filter with created_at_after (should be inclusive >=)
  const afterFilter = {
    created_at_after: startDate.toISOString(),
  } satisfies IEcommerceMallInventorySnapshot.IRequest;
  const afterResult =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerAuthorizedConnection,
      {
        inventoryRecordId: inventoryRecords[0].id,
        body: afterFilter,
      },
    );
  typia.assert(afterResult);
  // Test 2: Filter with created_at_before (should be inclusive <=)
  const beforeFilter = {
    created_at_before: endDate.toISOString(),
  } satisfies IEcommerceMallInventorySnapshot.IRequest;
  const beforeResult =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerAuthorizedConnection,
      {
        inventoryRecordId: inventoryRecords[0].id,
        body: beforeFilter,
      },
    );
  typia.assert(beforeResult);
  // Test 3: Filter with both dates (date range)
  const rangeFilter = {
    created_at_after: startDate.toISOString(),
    created_at_before: endDate.toISOString(),
  } satisfies IEcommerceMallInventorySnapshot.IRequest;
  const rangeResult =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerAuthorizedConnection,
      {
        inventoryRecordId: inventoryRecords[0].id,
        body: rangeFilter,
      },
    );
  typia.assert(rangeResult);
  // 4. Validate pagination works with filters
  const paginatedResult =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerAuthorizedConnection,
      {
        inventoryRecordId: inventoryRecords[0].id,
        body: {
          ...rangeFilter,
          limit: 2,
          page: 1,
        } satisfies IEcommerceMallInventorySnapshot.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid structure",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    paginatedResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    paginatedResult.pagination.limit === 2,
  );
  // 5. Test empty result case
  const noResultsFilter = {
    created_at_after: new Date(
      baseTime.getTime() + 25 * 60 * 60 * 1000,
    ).toISOString(),
    created_at_before: new Date(
      baseTime.getTime() + 26 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies IEcommerceMallInventorySnapshot.IRequest;
  const noResults =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerAuthorizedConnection,
      {
        inventoryRecordId: inventoryRecords[0].id,
        body: noResultsFilter,
      },
    );
  typia.assert(noResults);
  TestValidator.equals(
    "empty range returns no results",
    noResults.data.length,
    0,
  );
  TestValidator.equals(
    "empty range total count",
    noResults.pagination.records,
    0,
  );
  // 6. Test sorting with date range
  const sortedResult =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerAuthorizedConnection,
      {
        inventoryRecordId: inventoryRecords[0].id,
        body: {
          ...rangeFilter,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceMallInventorySnapshot.IRequest,
      },
    );
  typia.assert(sortedResult);
}
