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

export async function test_api_audit_log_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call audit log listing with all defaults
  const result = await api.functional.shoppingMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination defaults
  TestValidator.equals("current page default", result.pagination.current, 1);
  TestValidator.equals("limit default", result.pagination.limit, 20);
  TestValidator.predicate(
    "records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.equals(
    "pages calculation",
    result.pagination.pages,
    Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 4. Validate descending sort by created_at
  for (let i = 0; i < result.data.length - 1; i++) {
    TestValidator.predicate(
      "sort descending by created_at",
      result.data[i].created_at >= result.data[i + 1].created_at,
    );
  }
  // 5. Verify immutable audit log (no updated_at or deleted_at)
  for (const entry of result.data) {
    TestValidator.predicate("no updated_at", !("updated_at" in entry));
    TestValidator.predicate("no deleted_at", !("deleted_at" in entry));
  }
}
