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

/**
 * Test that regular administrators only see their own audit logs and cannot access other admins' actions.
 * Validates data isolation between admin actors for audit trail visibility.
 */
export async function test_api_admin_audit_trails_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Super Administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminResult = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(superAdminResult);
  const superAdminId = superAdminResult.id;
  // 2. Create Regular Administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminResult = await authorize_admin_join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(regularAdminResult);
  const regularAdminId = regularAdminResult.id;
  // 3. Regular admin performs an action (e.g., create audit trail entry by querying)
  const regularAdminAuditRequest: IEcommerceMallAdminAuditLog.IRequest = {
    adminId: regularAdminId,
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallAdminAuditLog.IRequest;
  const regularAdminAuditResponse =
    await api.functional.ecommerceMall.admin.audit_trails.index(
      regularAdminConnection,
      { body: regularAdminAuditRequest },
    );
  typia.assert(regularAdminAuditResponse);
  // 4. Query audit trails as regular admin with their adminId filter
  const regularAdminFilteredRequest: IEcommerceMallAdminAuditLog.IRequest = {
    adminId: regularAdminId,
    page: 1,
    limit: 100,
  } satisfies IEcommerceMallAdminAuditLog.IRequest;
  const regularAdminFilteredResponse =
    await api.functional.ecommerceMall.admin.audit_trails.index(
      regularAdminConnection,
      { body: regularAdminFilteredRequest },
    );
  typia.assert(regularAdminFilteredResponse);
  // 5. Validate regular admin only sees their own action logs
  const regularAdminActionLogs = regularAdminFilteredResponse.data.filter(
    (entry) =>
      entry.type === "admin_log" &&
      typeof entry.user === "object" &&
      entry.user.id === regularAdminId,
  );
  TestValidator.equals(
    "regular admin sees only own action logs",
    regularAdminActionLogs.length,
    1,
  );
  // 6. Validate no other admin's action logs are visible to regular admin
  const otherAdminActionLogs = regularAdminFilteredResponse.data.filter(
    (entry) =>
      entry.type === "admin_log" &&
      typeof entry.user === "object" &&
      entry.user.id === superAdminId,
  );
  TestValidator.equals(
    "regular admin cannot see super admin's action logs",
    otherAdminActionLogs.length,
    0,
  );
  // 7. Validate snapshot audits are visible to regular admin
  const snapshotAudits = regularAdminFilteredResponse.data.filter(
    (entry) => entry.type === "snapshot_audit",
  );
  TestValidator.notEquals(
    "snapshot audits visible to regular admin",
    snapshotAudits.length,
    0,
  );
  // 8. Query audit trails as super admin (no adminId filter - should see all)
  const superAdminFilteredRequest: IEcommerceMallAdminAuditLog.IRequest = {
    page: 1,
    limit: 100,
  } satisfies IEcommerceMallAdminAuditLog.IRequest;
  const superAdminFilteredResponse =
    await api.functional.ecommerceMall.admin.audit_trails.index(
      superAdminConnection,
      { body: superAdminFilteredRequest },
    );
  typia.assert(superAdminFilteredResponse);
  // 9. Validate super admin sees action logs from both admins
  const superAdminActionLogs = superAdminFilteredResponse.data.filter(
    (entry) => entry.type === "admin_log",
  );
  const superAdminOwnLogs = superAdminActionLogs.filter(
    (entry) => typeof entry.user === "object" && entry.user.id === superAdminId,
  );
  const superAdminOtherAdminLogs = superAdminActionLogs.filter(
    (entry) =>
      typeof entry.user === "object" && entry.user.id === regularAdminId,
  );
  TestValidator.equals(
    "super admin sees own action logs",
    superAdminOwnLogs.length,
    1,
  );
  TestValidator.equals(
    "super admin sees regular admin's action logs",
    superAdminOtherAdminLogs.length,
    1,
  );
  // 10. Verify snapshot audits visible to super admin
  const superAdminSnapshotAudits = superAdminFilteredResponse.data.filter(
    (entry) => entry.type === "snapshot_audit",
  );
  TestValidator.notEquals(
    "super admin sees snapshot audits",
    superAdminSnapshotAudits.length,
    0,
  );
  // 11. Validate that regular admin response has fewer total entries than super admin
  TestValidator.notEquals(
    "regular admin sees fewer entries than super admin",
    regularAdminFilteredResponse.pagination.records,
    superAdminFilteredResponse.pagination.records,
  );
}