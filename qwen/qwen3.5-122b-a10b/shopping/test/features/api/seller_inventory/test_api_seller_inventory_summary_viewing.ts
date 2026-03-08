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

export async function test_api_seller_inventory_summary_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. View inventory summary with default pagination
  const inventorySummary =
    await api.functional.ecommerceMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "recorded_at",
          sort_order: "desc",
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
  TestValidator.predicate(
    "current page valid",
    inventorySummary.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit valid",
    inventorySummary.pagination.limit > 0 &&
      inventorySummary.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count valid",
    inventorySummary.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    inventorySummary.pagination.pages >= 0,
  );
  // 4. Validate inventory record structure if data exists
  if (inventorySummary.data.length > 0) {
    const firstRecord = inventorySummary.data[0];
    typia.assert(firstRecord);
    // Business logic validations (not type validations - typia.assert already covers types)
    TestValidator.predicate(
      "quantity change is integer",
      Number.isInteger(firstRecord.quantity_change),
    );
    TestValidator.predicate(
      "current stock is non-negative",
      firstRecord.current_stock >= 0,
    );
    TestValidator.predicate(
      "variant sku code is not empty",
      firstRecord.variant_sku_code.length > 0,
    );
    TestValidator.predicate(
      "product name is not empty",
      firstRecord.product_name.length > 0,
    );
  }
  // 5. Test pagination with different page numbers
  const page2 =
    await api.functional.ecommerceMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  // 6. Test filtering by reason
  const filteredByReason =
    await api.functional.ecommerceMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          reason: "restock",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(filteredByReason);
  // All records should have the filtered reason
  for (const record of filteredByReason.data) {
    TestValidator.equals("all records match reason", record.reason, "restock");
  }
  // 7. Test sorting by quantity_change
  const sortedByQuantity =
    await api.functional.ecommerceMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          sort_by: "quantity_change",
          sort_order: "desc",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(sortedByQuantity);
  // 8. Test sorting by reason
  const sortedByReason =
    await api.functional.ecommerceMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          sort_by: "reason",
          sort_order: "asc",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(sortedByReason);
}
