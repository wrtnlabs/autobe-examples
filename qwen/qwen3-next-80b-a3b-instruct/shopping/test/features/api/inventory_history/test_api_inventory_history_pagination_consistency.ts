import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_inventory_history_pagination_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // 2. Generate test variant ID
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Fetch first page of inventory history
  const page1 = await api.functional.shoppingMall.admin.inventory.history.index(
    adminConnection,
    { variantId },
  );
  typia.assert(page1);
  // 4. Fetch second page of inventory history
  const page2 = await api.functional.shoppingMall.admin.inventory.history.index(
    adminConnection,
    { variantId },
  );
  typia.assert(page2);
  // 5. Fetch third page of inventory history
  const page3 = await api.functional.shoppingMall.admin.inventory.history.index(
    adminConnection,
    { variantId },
  );
  typia.assert(page3);
  // 6. Validate that total records count is consistent across all pages
  TestValidator.equals(
    "total records consistent across pages",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "total records consistent across pages",
    page2.pagination.records,
    page3.pagination.records,
  );
  // 7. Validate pagination limits are consistent (should be same for all)
  TestValidator.equals(
    "limit consistent across pages",
    page1.pagination.limit,
    page2.pagination.limit,
  );
  TestValidator.equals(
    "limit consistent across pages",
    page2.pagination.limit,
    page3.pagination.limit,
  );
  // 8. Validate pagination current page numbers are sequential
  TestValidator.equals("first page current", page1.pagination.current, 1);
  TestValidator.equals("second page current", page2.pagination.current, 2);
  TestValidator.equals("third page current", page3.pagination.current, 3);
  // 9. Validate total pages calculated correctly
  TestValidator.equals(
    "total pages match",
    page1.pagination.pages,
    Math.ceil(page1.pagination.records / (page1.pagination.limit || 1)),
  );
  TestValidator.equals(
    "total pages match",
    page2.pagination.pages,
    Math.ceil(page2.pagination.records / (page2.pagination.limit || 1)),
  );
  TestValidator.equals(
    "total pages match",
    page3.pagination.pages,
    Math.ceil(page3.pagination.records / (page3.pagination.limit || 1)),
  );
  // 10. Validate data ordering: all records are ordered by created_at DESC within each page
  // Not applicable - IShoppingMallInventoryLog has no created_at property
  // 11. Validate no duplicates across pages
  // Not applicable - IShoppingMallInventoryLog has no id property
  // 12. Validate chronological continuity between pages
  // Not applicable - IShoppingMallInventoryLog has no created_at property
  // 13. Validate that all data records have correct shape
  for (const log of [...page1.data, ...page2.data, ...page3.data]) {
    TestValidator.predicate("change_quantity is integer", () =>
      Number.isInteger(log.change_quantity),
    );
    TestValidator.predicate("reason is valid enum value", () =>
      [
        "restock",
        "order",
        "cancellation",
        "refund",
        "adjustment",
        "loss",
      ].includes(log.reason),
    );
    TestValidator.predicate(
      "reference_id is string or null",
      () =>
        log.reference_id === null ||
        (typeof log.reference_id === "string" && log.reference_id.length > 0),
    );
    // Not applicable - IShoppingMallInventoryLog has no created_at property
    if (log.notes !== null && log.notes !== undefined) {
      TestValidator.predicate(
        "notes is string",
        () => typeof log.notes === "string",
      );
    }
  }
}
