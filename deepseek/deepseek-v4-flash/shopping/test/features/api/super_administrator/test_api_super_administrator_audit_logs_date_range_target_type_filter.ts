import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministratorAuditLog";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test audit log query with date range and target type filters for dispute resolution.
 *
 * Validates that a super administrator can retrieve audit log entries for a specific administrator within a defined investigation window using the created_at date range filter. Also verifies that combining the date range with a target_type filter correctly scopes results to only actions on that entity type within the period, demonstrating the filtering composability needed for thorough investigations.
 *
 * 1. Authenticate as a super administrator via the join endpoint.
 * 2. Call the audit-logs endpoint with the promoted administrator's ID, specifying created_at.from and created_at.to for an investigation window, and a target_type filter of "customer".
 * 3. Validate all returned entries have created_at timestamps within the inclusive range and target_type matching the filter.
 */
export async function test_api_super_administrator_audit_logs_date_range_target_type_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(authorized);
  // 2. Query audit logs with date range and target_type filter
  const auditLogs =
    await api.functional.eCommerceMall.superAdministrator.administrators.audit_logs.index(
      superAdminConnection,
      {
        administratorId: authorized.administrator.id,
        body: {
          created_at: {
            from: "2020-01-01T00:00:00.000Z",
            to: "2030-01-01T00:00:00.000Z",
          },
          target_type: "customer",
        } satisfies IECommerceMallAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(auditLogs);
  // 3. Validate all returned entries have created_at within the inclusive range
  for (const entry of auditLogs.data) {
    TestValidator.predicate(
      `audit log ${entry.id} created_at within range`,
      () =>
        entry.created_at >= "2020-01-01T00:00:00.000Z" &&
        entry.created_at <= "2030-01-01T00:00:00.000Z",
    );
  }
  // 4. Validate all returned entries match the target_type filter
  for (const entry of auditLogs.data) {
    TestValidator.equals(
      `audit log ${entry.id} target_type`,
      entry.target_type,
      "customer",
    );
  }
}
