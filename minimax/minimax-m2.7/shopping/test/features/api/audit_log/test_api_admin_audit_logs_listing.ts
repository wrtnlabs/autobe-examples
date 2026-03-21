import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call audit logs endpoint with empty request body to retrieve all logs
  const response =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  // 3. Validate response structure using typia.assert()
  typia.assert(response);
  // 4. Validate response has required properties
  TestValidator.equals(
    "response has pagination",
    response.pagination !== null && response.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(response.data),
    true,
  );
  // 5. Validate pagination object structure
  TestValidator.predicate(
    "pagination current is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 6. Validate relationship between pagination fields
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "has pages when records exist",
      response.pagination.pages > 0,
    );
  }
  // 7. If audit logs exist, validate their structure
  if (response.data.length > 0) {
    const firstLog = response.data[0];
    TestValidator.equals(
      "audit log has id",
      firstLog.id !== null && firstLog.id !== undefined,
      true,
    );
    TestValidator.equals(
      "audit log has action",
      firstLog.action !== null && firstLog.action !== undefined,
      true,
    );
    TestValidator.equals(
      "audit log has resource_type",
      firstLog.resource_type !== null && firstLog.resource_type !== undefined,
      true,
    );
    TestValidator.equals(
      "audit log has created_at",
      firstLog.created_at !== null && firstLog.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "audit log has admin",
      firstLog.admin !== null && firstLog.admin !== undefined,
      true,
    );
    // 8. Validate nested admin summary structure
    const admin = firstLog.admin;
    TestValidator.equals(
      "admin has id",
      admin.id !== null && admin.id !== undefined,
      true,
    );
    TestValidator.equals(
      "admin has email",
      admin.email !== null && admin.email !== undefined,
      true,
    );
    TestValidator.equals(
      "admin has name",
      admin.name !== null && admin.name !== undefined,
      true,
    );
    // 9. Verify sorting by created_at descending (newest first)
    for (let i = 1; i < response.data.length; i++) {
      const current = new Date(response.data[i].created_at);
      const previous = new Date(response.data[i - 1].created_at);
      TestValidator.predicate(
        `log[${i}] is not newer than log[${i - 1}]`,
        current <= previous,
      );
    }
  }
}
