import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingInventoryAdjustment";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventoryAdjustment";

/**
 * E2E test to validate that an authorized admin can retrieve the full audit and
 * adjustment log for a SKU's inventory, and that unauthorized/invalid token
 * requests are rejected.
 *
 * Steps:
 *
 * 1. Register a new admin (acquires authentication token via
 *    api.functional.auth.admin.join)
 * 2. Choose a random SKU code (since there is no product creation in test scope,
 *    uses a random string)
 * 3. Attempt access to adjustment log as authorized admin using PATCH
 *    /shopping/admin/inventory/{skuCode}/adjustments with valid token
 * 4. Verify log structure, pagination values, and details of adjustment entries
 *    (actor_type, actor_id, reason_code, before/after values, timestamp, etc.)
 * 5. Attempt to access the same endpoint with an invalid/unauthorized connection
 *    and expect a permission error.
 */
export async function test_api_admin_inventory_adjustment_log_access_authorized_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    role: RandomGenerator.pick([
      "super",
      "operator",
      "support",
      "compliance",
    ] as const),
    status: RandomGenerator.pick(["active", "pending", "suspended"] as const),
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Prepare the SKU code to examine - for this test, a random code string
  const skuCode: string = RandomGenerator.alphaNumeric(10);

  // 3. Prepare audit log query parameters (pagination, filter, sort)
  const queryBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    actor_type: "admin",
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingInventoryAdjustment.IRequest;

  // 4. Access the audit/adjustment log as authorized admin
  const page: IPageIShoppingInventoryAdjustment =
    await api.functional.shopping.admin.inventory.adjustments.index(
      connection,
      { skuCode, body: queryBody },
    );
  typia.assert(page);

  // 5. Validate pagination and audit log content
  TestValidator.predicate(
    "pagination info present",
    !!page.pagination && typeof page.pagination.current === "number",
  );
  TestValidator.predicate("data array present", Array.isArray(page.data));
  TestValidator.predicate(
    "data respects pagination limit",
    page.data.length <= queryBody.limit,
  );
  for (const log of page.data) {
    typia.assert(log);
    TestValidator.equals("actor_type is admin", log.actor_type, "admin");
    TestValidator.predicate(
      "adjustment event has before/after values",
      typeof log.quantity_before === "number" &&
        typeof log.quantity_after === "number",
    );
    TestValidator.predicate(
      "event has valid reason code",
      typeof log.reason_code === "string" && log.reason_code.length > 0,
    );
    TestValidator.predicate(
      "adjustment amount is correct",
      log.quantity_after - log.quantity_before === log.adjustment_amount,
    );
    TestValidator.predicate(
      "created_at is ISO 8601",
      typeof log.created_at === "string" && log.created_at.indexOf("T") > 0,
    );
    TestValidator.predicate(
      "actor_id is uuid string",
      typeof log.actor_id === "string" &&
        /^[0-9a-fA-F\-]{36}$/.test(log.actor_id),
    );
  }

  // 6. Attempt unauthorized access - should result in permission error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized request should fail", async () => {
    await api.functional.shopping.admin.inventory.adjustments.index(
      unauthConn,
      { skuCode, body: queryBody },
    );
  });
}
