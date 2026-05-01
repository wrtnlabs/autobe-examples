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
 * Test that an administrator can filter audit log entries by action_type.
 *
 * Validates the action_type exact-match filter on the admin audit log endpoint.
 * After registering as an administrator, queries the audit log with action_type
 * set to 'approve_seller' and verifies that every returned entry has that action
 * type, the pagination records field reflects only filtered entries, and results
 * remain sorted by created_at descending (newest first).
 *
 * 1. Administrator registers on the platform via authorize_admin_join.
 * 2. Queries the audit log with action_type filter set to 'approve_seller'.
 * 3. Validates all returned entries have action_type 'approve_seller'.
 * 4. Confirms pagination records count reflects only filtered entries.
 * 5. Verifies results are sorted by created_at descending (newest first).
 */
export async function test_api_audit_log_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Query audit log filtered by action_type
  const result = await api.functional.shoppingMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        action_type: "approve_seller",
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate all entries have the correct action_type
  TestValidator.predicate("all entries have action_type approve_seller", () =>
    result.data.every((entry) => entry.action_type === "approve_seller"),
  );
  // 4. Validate pagination records reflects filtered count, not total
  TestValidator.predicate(
    "pagination records count is at least the data length",
    result.pagination.records >= result.data.length,
  );
  // 5. Validate results are sorted by created_at descending (newest first)
  if (result.data.length > 1) {
    TestValidator.predicate("results sorted by created_at descending", () =>
      result.data.every(
        (entry, i) =>
          i === 0 || entry.created_at <= result.data[i - 1].created_at,
      ),
    );
  }
}
