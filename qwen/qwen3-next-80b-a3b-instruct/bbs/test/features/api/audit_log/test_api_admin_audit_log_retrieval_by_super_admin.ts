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

export async function test_api_admin_audit_log_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate super administrator credentials
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicBoardSuperAdministrator.IJoin;
  // 2. Create super administrator account using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    { body: superAdminCredentials },
  );
  typia.assert(superAdminAuth);
  // 3. Retrieve a specific audit log entry (simulation)
  // Since we need an existing audit log entry, we simulate one
  const auditLogEntry = typia.random<IEconomicBoardAdministratorAuditLog>();
  typia.assert(auditLogEntry);
  // 4. Verify that the audit log entry has a valid UUID
  const logId = auditLogEntry.id;
  typia.assert<`uuid`>(logId);
  // 5. Call the API to retrieve the specific audit log entry
  const retrievedAuditLog =
    await api.functional.economicBoard.superAdministrator.admin.audit_logs.at(
      superAdminConnection,
      { logId },
    );
  typia.assert(retrievedAuditLog);
  // 6. Validate that retrieved audit log matches expected structure
  TestValidator.equals("audit log id matches", retrievedAuditLog.id, logId);
  TestValidator.equals(
    "actor_id matches",
    retrievedAuditLog.actor_id,
    auditLogEntry.actor_id,
  );
  TestValidator.equals(
    "action_type matches",
    retrievedAuditLog.action_type,
    auditLogEntry.action_type,
  );
  TestValidator.equals(
    "ip_address matches",
    retrievedAuditLog.ip_address,
    auditLogEntry.ip_address,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedAuditLog.created_at,
    auditLogEntry.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedAuditLog.updated_at,
    auditLogEntry.updated_at,
  );
  // Validate actor summary object
  TestValidator.equals(
    "actor.id matches",
    retrievedAuditLog.actor.id,
    auditLogEntry.actor.id,
  );
  TestValidator.equals(
    "actor.email matches",
    retrievedAuditLog.actor.email,
    auditLogEntry.actor.email,
  );
  TestValidator.equals(
    "actor.display_name matches",
    retrievedAuditLog.actor.display_name,
    auditLogEntry.actor.display_name,
  );
  TestValidator.equals(
    "actor.bio matches",
    retrievedAuditLog.actor.bio,
    auditLogEntry.actor.bio,
  );
  TestValidator.equals(
    "actor.created_at matches",
    retrievedAuditLog.actor.created_at,
    auditLogEntry.actor.created_at,
  );
  TestValidator.equals(
    "actor.updated_at matches",
    retrievedAuditLog.actor.updated_at,
    auditLogEntry.actor.updated_at,
  );
  // Validate target summary object if present
  if (auditLogEntry.target !== null && auditLogEntry.target !== undefined) {
    TestValidator.equals(
      "target.id matches",
      retrievedAuditLog.target?.id,
      auditLogEntry.target?.id,
    );
    TestValidator.equals(
      "target.display_name matches",
      retrievedAuditLog.target?.display_name,
      auditLogEntry.target?.display_name,
    );
    TestValidator.equals(
      "target.created_at matches",
      retrievedAuditLog.target?.created_at,
      auditLogEntry.target?.created_at,
    );
    TestValidator.equals(
      "target.updated_at matches",
      retrievedAuditLog.target?.updated_at,
      auditLogEntry.target?.updated_at,
    );
    TestValidator.equals(
      "target.article_count matches",
      retrievedAuditLog.target?.article_count,
      auditLogEntry.target?.article_count,
    );
    TestValidator.equals(
      "target.comment_count matches",
      retrievedAuditLog.target?.comment_count,
      auditLogEntry.target?.comment_count,
    );
  } else {
    TestValidator.equals(
      "target is null",
      retrievedAuditLog.target,
      auditLogEntry.target,
    );
  }
  // 7. Validate reason field if it exists
  if (auditLogEntry.reason !== null && auditLogEntry.reason !== undefined) {
    TestValidator.equals(
      "reason matches",
      retrievedAuditLog.reason,
      auditLogEntry.reason,
    );
  } else {
    TestValidator.equals(
      "reason is null or undefined",
      retrievedAuditLog.reason,
      auditLogEntry.reason,
    );
  }
}
