import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministratorAuditLog";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test that a super administrator can retrieve a single administrator audit log entry by its unique identifier.
 *
 * Validates the retrieval of a specific audit log entry scoped to an individual regular administrator. First authenticates as a super administrator via promotion of an existing regular administrator, then calls the audit log retrieval endpoint with the promoted administrator's ID and the target log entry's ID. Ensures the returned record matches the audit log DTO structure including the administrator summary, action type, target entity references, reason, and timestamps.
 *
 * 1. Authenticate as a super administrator by promoting an existing regular administrator.
 * 2. Retrieve the administrative audit log entry by the promoted administrator's ID and log ID.
 * 3. Validate the response structure matches IECommerceMallAdministratorAuditLog.
 * 4. Verify that the returned administrator reference matches the scoped administrator ID.
 */
export async function test_api_super_administrator_audit_log_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(authorized);
  // 2. Retrieve the audit log entry
  const auditLog =
    await api.functional.eCommerceMall.superAdministrator.administrators.audit_logs.at(
      superAdminConnection,
      {
        administratorId: authorized.administrator.id,
        logId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(auditLog);
  // 3. Validate the administrator reference matches
  TestValidator.equals(
    "audit log administrator id matches path parameter",
    auditLog.administrator.id,
    authorized.administrator.id,
  );
  // 4. Validate audit log immutability (deleted_at must be null)
  TestValidator.predicate(
    "audit log is immutable (deleted_at is null)",
    auditLog.deleted_at === null,
  );
}
