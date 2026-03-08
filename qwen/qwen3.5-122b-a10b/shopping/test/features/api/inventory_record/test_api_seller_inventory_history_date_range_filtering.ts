import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_seller_inventory_history_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Generate a variant ID for testing (in real scenario, this would come from product creation)
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test 1: Filter with both recorded_at_from and recorded_at_to (date range intersection)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          recorded_at_from: thirtyDaysAgo.toISOString(),
          recorded_at_to: fifteenDaysAgo.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate that all returned records fall within the date range
  for (const record of dateRangeResult.data) {
    const recordTime = new Date(record.recorded_at).getTime();
    TestValidator.predicate(
      "record falls within date range (from)",
      recordTime >= thirtyDaysAgo.getTime(),
    );
    TestValidator.predicate(
      "record falls within date range (to)",
      recordTime <= fifteenDaysAgo.getTime(),
    );
  }
  // 4. Test 2: Filter with only recorded_at_from
  const fromOnlyResult =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          recorded_at_from: fifteenDaysAgo.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(fromOnlyResult);
  // Validate that all returned records are from the specified date onwards
  for (const record of fromOnlyResult.data) {
    const recordTime = new Date(record.recorded_at).getTime();
    TestValidator.predicate(
      "record is from specified date onwards",
      recordTime >= fifteenDaysAgo.getTime(),
    );
  }
  // 5. Test 3: Filter with only recorded_at_to
  const toOnlyResult =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          recorded_at_to: fifteenDaysAgo.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(toOnlyResult);
  // Validate that all returned records are up to the specified date
  for (const record of toOnlyResult.data) {
    const recordTime = new Date(record.recorded_at).getTime();
    TestValidator.predicate(
      "record is up to specified date",
      recordTime <= fifteenDaysAgo.getTime(),
    );
  }
  // 6. Test 4: No date filters (should return all records)
  const allRecordsResult =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allRecordsResult);
  // 7. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    dateRangeResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    dateRangeResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    dateRangeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    dateRangeResult.pagination.pages >= 0,
  );
  // 8. Validate inventory record structure (only if records exist)
  if (dateRangeResult.data.length > 0) {
    const sampleRecord = dateRangeResult.data[0];
    TestValidator.predicate(
      "record has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleRecord.id,
      ),
    );
    TestValidator.predicate(
      "quantity change is an integer",
      Number.isInteger(sampleRecord.quantity_change),
    );
    TestValidator.predicate(
      "current stock is an integer",
      Number.isInteger(sampleRecord.current_stock),
    );
    TestValidator.predicate(
      "recorded_at is valid ISO 8601 datetime",
      !isNaN(Date.parse(sampleRecord.recorded_at)),
    );
    TestValidator.predicate(
      "reason is non-empty",
      sampleRecord.reason.length > 0,
    );
    TestValidator.predicate(
      "variant SKU code is non-empty",
      sampleRecord.variant_sku_code.length > 0,
    );
    TestValidator.predicate(
      "product name is non-empty",
      sampleRecord.product_name.length > 0,
    );
  }
}
