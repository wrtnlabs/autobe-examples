import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an authenticated administrator can retrieve a paginated list of all administrator audit logs.
 *
 * Validates the complete audit log retrieval flow including administrator authentication and paginated list access. Ensures that the response contains properly structured audit log entries with pagination metadata and embedded administrator summaries.
 *
 * Special attention is given to verifying the pagination structure, audit log entry fields, and the embedded administrator summary information. The test confirms that default pagination parameters are applied when no filters are specified.
 *
 * 1. Register and authenticate as an administrator using the utility function.
 * 2. Call the audit logs endpoint with an empty request body to retrieve all logs with default pagination.
 * 3. Validate the pagination metadata (current page, limit, total records, total pages).
 * 4. Verify each audit log entry contains required fields (id, action_type, target_type, target_id, ip_address, user_agent, created_at).
 * 5. Verify the embedded administrator summary contains required fields (id, email, grade, banned, created_at, deleted_at).
 * 6. Confirm results are sorted by created_at descending (newest first).
 */
export async function test_api_administrator_audit_logs_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Retrieve all audit logs with default pagination (no filters)
  const output =
    await api.functional.shoppingMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(output);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", output.pagination.current, 1);
  TestValidator.equals("default limit is 20", output.pagination.limit, 20);
  TestValidator.predicate(
    "has non-negative records",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has non-negative pages",
    output.pagination.pages >= 0,
  );
  // 4. Validate each audit log entry structure
  await ArrayUtil.asyncForEach(output.data, async (log, index) => {
    typia.assert(log);
    // Verify embedded administrator summary exists and is valid
    typia.assert(log.administrator);
  });
  // 5. Verify sorting by created_at descending (newest first)
  if (output.data.length > 1) {
    await ArrayUtil.asyncForEach(output.data.slice(1), async (log, index) => {
      const prevLog = output.data[index];
      TestValidator.predicate(
        `log ${index + 1} is not newer than log ${index}`,
        new Date(log.created_at).getTime() <=
          new Date(prevLog.created_at).getTime(),
      );
    });
  }
}
