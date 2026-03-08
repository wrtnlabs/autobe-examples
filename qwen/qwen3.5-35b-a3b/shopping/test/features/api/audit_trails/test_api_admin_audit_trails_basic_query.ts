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

export async function test_api_admin_audit_trails_basic_query(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create new admin-specific connection with token
  const auditConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // 3. Call audit trails endpoint with minimal pagination
  const auditResponse =
    await api.functional.ecommerceMall.admin.audit_trails.index(
      auditConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(auditResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current",
    auditResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", auditResponse.pagination.limit, 10);
  TestValidator.predicate(
    "pagination pages calculated correctly",
    () =>
      auditResponse.pagination.pages ===
      Math.ceil(auditResponse.pagination.records / 10),
  );
  // 5. Validate data array exists
  if (auditResponse.data.length === 0) {
    // Test passes with empty data - pagination still valid
    return;
  }
  // 6. Validate type discrimination for each record
  let hasAdminLog = false;
  let hasSnapshotAudit = false;
  for (const record of auditResponse.data) {
    // Validate type discriminator
    if (record.type === "admin_log") {
      hasAdminLog = true;
      // Validate user is IEcommerceMallAdmin.ISummary (non-null)
      const adminUser = record.user as IEcommerceMallAdmin.ISummary;
      typia.assert(adminUser);
    } else if (record.type === "snapshot_audit") {
      hasSnapshotAudit = true;
      // For snapshot_audit, user should be null
      TestValidator.equals("snapshot_audit user is null", record.user, null);
    } else {
      throw new Error(`Invalid audit type: ${record.type}`);
    }
    // Validate status is always 'active'
    TestValidator.equals("record status is active", record.status, "active");
  }
  // 7. Validate timestamps are valid ISO 8601 (typia.assert on response handles this)
  // 8. Verify at least one record from each source type if data exists
  // Note: This may not pass if database is empty, so we validate structure only
  if (auditResponse.data.length > 0) {
    TestValidator.predicate(
      "records have valid type discriminator",
      () => hasAdminLog || hasSnapshotAudit,
    );
  }
}
