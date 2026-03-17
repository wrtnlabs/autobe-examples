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

export async function test_api_seller_inventory_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller account
  const sellerAuthorized: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerAuthorized);
  // 2. Create seller-specific connection with authorization token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuthorized.token.access,
    },
  };
  // 3. Generate a random variant ID for testing
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Test basic inventory records retrieval with default pagination
  const inventoryRecords1: IPageIEcommerceMallInventoryRecord.ISummary =
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
  typia.assert(inventoryRecords1);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    inventoryRecords1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    inventoryRecords1.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    inventoryRecords1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    inventoryRecords1.pagination.pages >= 0,
  );
  // 6. Validate inventory record structure if records exist
  if (inventoryRecords1.data.length > 0) {
    const firstRecord = inventoryRecords1.data[0];
    typia.assert(firstRecord);
    TestValidator.predicate(
      "quantity_change is integer",
      typeof firstRecord.quantity_change === "number",
    );
    TestValidator.predicate(
      "reason is string",
      typeof firstRecord.reason === "string",
    );
    TestValidator.predicate(
      "recorded_at is valid date-time",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstRecord.recorded_at,
      ),
    );
    TestValidator.predicate(
      "current_stock is non-negative integer",
      firstRecord.current_stock >= 0,
    );
    TestValidator.predicate(
      "variant_sku_code is string",
      typeof firstRecord.variant_sku_code === "string",
    );
    TestValidator.predicate(
      "product_name is string",
      typeof firstRecord.product_name === "string",
    );
  }
  // 7. Test with different pagination parameters
  const inventoryRecords2: IPageIEcommerceMallInventoryRecord.ISummary =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(inventoryRecords2);
  TestValidator.equals(
    "pagination current page is 2",
    inventoryRecords2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 10",
    inventoryRecords2.pagination.limit,
    10,
  );
  // 8. Test sorting by quantity_change in descending order
  const inventoryRecords3: IPageIEcommerceMallInventoryRecord.ISummary =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          sort_by: "quantity_change",
          sort_order: "desc",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(inventoryRecords3);
  // 9. Test sorting by reason in ascending order
  const inventoryRecords4: IPageIEcommerceMallInventoryRecord.ISummary =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          sort_by: "reason",
          sort_order: "asc",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(inventoryRecords4);
  // 10. Test filtering by reason
  const inventoryRecords5: IPageIEcommerceMallInventoryRecord.ISummary =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          reason: "restock",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(inventoryRecords5);
  // 11. Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const inventoryRecords6: IPageIEcommerceMallInventoryRecord.ISummary =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          recorded_at_from: thirtyDaysAgo.toISOString(),
          recorded_at_to: now.toISOString(),
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(inventoryRecords6);
  // 12. Validate date range filtering when records exist
  if (inventoryRecords6.data.length > 0) {
    const firstRecord = inventoryRecords6.data[0];
    const recordDate = new Date(firstRecord.recorded_at);
    TestValidator.predicate(
      "filtered record is within date range",
      recordDate >= thirtyDaysAgo && recordDate <= now,
    );
  }
}
