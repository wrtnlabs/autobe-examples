import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_filter_by_action_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Define multiple action types for OR filtering
  const actionTypes = ["employee_invited", "contract_created"] as const;
  // 3. Send PATCH request with action_types filter
  const result = await api.functional.erpHrm.admin.admin_audit_logs.index(
    adminConnection,
    {
      body: {
        action_types: [...actionTypes],
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IErpHrmAdminAuditLog.IRequest,
    },
  );
  typia.assert(result);
  // 4. Validate all returned entries match one of the specified action types (OR logic)
  for (const entry of result.data) {
    const matchesActionType = actionTypes.includes(
      entry.actionType as (typeof actionTypes)[number],
    );
    TestValidator.predicate(
      `audit log entry ${entry.id} should match one of action types`,
      matchesActionType,
    );
  }
  // 5. Validate pagination metadata is present
  TestValidator.predicate(
    "pagination should have current page",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have limit",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have total records",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have total pages",
    result.pagination.pages >= 0,
  );
}
