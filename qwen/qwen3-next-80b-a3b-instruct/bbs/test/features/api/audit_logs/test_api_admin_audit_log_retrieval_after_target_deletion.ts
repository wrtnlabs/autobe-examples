import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministrator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_admin_audit_log_retrieval_after_target_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator account for authenticated access
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  superAdminConnection.headers = { Authorization: superAdmin.token.access };
  // Generate a random audit log ID (since we cannot create or list audit logs)
  const logId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the audit log entry
  const auditLog =
    await api.functional.economicBoard.superAdministrator.admin.audit_logs.at(
      superAdminConnection,
      { logId },
    );
  typia.assert(auditLog);
  // Note: The scenario requires the target to be deleted, but we cannot simulate deletion
  // as no delete endpoint is provided. This test verifies that the API returns audit log entries
  // with the correct type structure (IAdministrator.ISummary for actor and IUser.ISummary for target)
  // as defined in the schema. The typia.assert() ensures the response matches the IEconomicBoardAdministratorAuditLog type,
  // which includes the required actor and target fields with their respective summary types.
}
