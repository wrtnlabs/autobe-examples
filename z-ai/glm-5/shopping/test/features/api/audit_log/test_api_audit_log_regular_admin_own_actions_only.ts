import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that a regular administrator can only view their own audit log entries,
 * not those of other administrators.
 *
 * Business Rule: Regular administrators are automatically scoped to their own
 * actions and cannot view other administrators' audit logs.
 */
export async function test_api_audit_log_regular_admin_own_actions_only(
  connection: api.IConnection,
): Promise<void> {
  // ===========================================
  // SETUP: Create two regular administrator accounts
  // ===========================================
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(firstAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: `FirstAdmin_${RandomGenerator.alphabets(8)}`,
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(firstAdmin);
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdmin = await authorize_admin_join(secondAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: `SecondAdmin_${RandomGenerator.alphabets(8)}`,
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(secondAdmin);
  // ===========================================
  // TEST 1: Query audit logs without filters
  // ===========================================
  const auditLogsResponse =
    await api.functional.shoppingMall.admin.audit_logs.index(
      firstAdminConnection,
      {
        body: {} satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsResponse);
  // ===========================================
  // TEST 2: Verify pagination metadata
  // ===========================================
  TestValidator.predicate(
    "pagination has required fields",
    auditLogsResponse.pagination.current >= 0 &&
      auditLogsResponse.pagination.limit >= 0 &&
      auditLogsResponse.pagination.records >= 0 &&
      auditLogsResponse.pagination.pages >= 0,
  );
  // ===========================================
  // TEST 3: Verify all entries belong only to first admin
  // ===========================================
  const allEntriesBelongToFirstAdmin = auditLogsResponse.data.every(
    (entry) => entry.admin.id === firstAdmin.id,
  );
  TestValidator.predicate(
    "all audit log entries belong to authenticated admin",
    allEntriesBelongToFirstAdmin,
  );
  // Verify each entry has required fields
  for (const entry of auditLogsResponse.data) {
    typia.assert(entry);
    TestValidator.equals(
      "entry admin matches authenticated admin",
      entry.admin.id,
      firstAdmin.id,
    );
  }
  // ===========================================
  // TEST 4: Verify sorting (descending by created_at)
  // ===========================================
  if (auditLogsResponse.data.length > 1) {
    const timestamps = auditLogsResponse.data.map((entry) => entry.created_at);
    const sortedTimestamps = [...timestamps].sort((a, b) => b.localeCompare(a));
    TestValidator.equals(
      "results sorted by created_at descending",
      timestamps,
      sortedTimestamps,
    );
  }
  // ===========================================
  // TEST 5: Attempt to filter by second admin's ID
  // ===========================================
  const filteredResponse =
    await api.functional.shoppingMall.admin.audit_logs.index(
      firstAdminConnection,
      {
        body: {
          shopping_mall_admin_id: secondAdmin.id,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // Verify filter was ignored - still only first admin's logs
  const filteredEntriesStillOwn = filteredResponse.data.every(
    (entry) => entry.admin.id === firstAdmin.id,
  );
  TestValidator.predicate(
    "filter by other admin ID ignored",
    filteredEntriesStillOwn,
  );
  // ===========================================
  // TEST 6: Verify no second admin entries visible
  // ===========================================
  const hasSecondAdminEntries = auditLogsResponse.data.some(
    (entry) => entry.admin.id === secondAdmin.id,
  );
  TestValidator.equals(
    "no entries from second admin visible",
    hasSecondAdminEntries,
    false,
  );
}
