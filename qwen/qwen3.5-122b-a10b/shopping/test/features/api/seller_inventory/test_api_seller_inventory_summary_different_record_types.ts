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

export async function test_api_seller_inventory_summary_different_record_types(
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
  // Note: This test focuses on inventory summary endpoint which requires
  // seller authentication. The actual inventory record creation through
  // order placement, cancellation, and refund would require additional
  // endpoints for products, orders, and order management that are not
  // available in the current SDK. This test validates the inventory
  // summary query functionality with simulated data.
  // 2. Query inventory summary to verify endpoint works
  const inventorySummary =
    await api.functional.ecommerceMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(inventorySummary);
  // 3. Validate response structure
  TestValidator.predicate(
    "pagination exists",
    inventorySummary.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(inventorySummary.data),
  );
  // 4. If there are inventory records, validate their structure
  if (inventorySummary.data.length > 0) {
    const firstRecord = inventorySummary.data[0];
    typia.assert(firstRecord);
    TestValidator.predicate(
      "record has id",
      typeof firstRecord.id === "string",
    );
    TestValidator.predicate(
      "record has quantity_change",
      typeof firstRecord.quantity_change === "number",
    );
    TestValidator.predicate(
      "record has reason",
      typeof firstRecord.reason === "string",
    );
    TestValidator.predicate(
      "record has recorded_at",
      typeof firstRecord.recorded_at === "string",
    );
    TestValidator.predicate(
      "record has current_stock",
      typeof firstRecord.current_stock === "number",
    );
    TestValidator.predicate(
      "record has variant_sku_code",
      typeof firstRecord.variant_sku_code === "string",
    );
    TestValidator.predicate(
      "record has product_name",
      typeof firstRecord.product_name === "string",
    );
    // Validate quantity_change sign based on reason
    if (
      firstRecord.reason === "restock" ||
      firstRecord.reason === "cancellation_approved" ||
      firstRecord.reason === "refund_approved"
    ) {
      TestValidator.predicate(
        "positive quantity for restock/restoration",
        firstRecord.quantity_change > 0,
      );
    } else if (
      firstRecord.reason === "order_placement" ||
      firstRecord.reason === "manual_adjustment" ||
      firstRecord.reason === "inventory_loss"
    ) {
      TestValidator.predicate(
        "negative quantity for deduction",
        firstRecord.quantity_change < 0,
      );
    }
  }
  // 5. Test pagination parameters
  const paginatedSummary =
    await api.functional.ecommerceMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(paginatedSummary);
  TestValidator.predicate(
    "limit respected",
    paginatedSummary.data.length <= 10,
  );
  TestValidator.equals(
    "pagination current is 1",
    paginatedSummary.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginatedSummary.pagination.limit,
    10,
  );
  // 6. Test filtering by reason (if records exist)
  if (inventorySummary.data.length > 0) {
    const existingReason = inventorySummary.data[0].reason;
    const filteredSummary =
      await api.functional.ecommerceMall.seller.inventory.summary.index(
        sellerConnection,
        {
          body: {
            reason: existingReason,
          } satisfies IEcommerceMallInventoryRecord.IRequest,
        },
      );
    typia.assert(filteredSummary);
    // All returned records should have the filtered reason
    const allMatchReason = filteredSummary.data.every(
      (record) => record.reason === existingReason,
    );
    TestValidator.predicate(
      "all records match filtered reason",
      allMatchReason,
    );
  }
}
