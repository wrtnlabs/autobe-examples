import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_audit_log_admin_promote_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super admin using join endpoint
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: typia.random<IEcommerceMallSuperAdmin.IJoin>(),
    },
  );
  typia.assert(authorized);
  // Step 2: Retrieve a super admin audit log by ID
  const auditLog =
    await api.functional.ecommerceMall.superAdmin.super_admin_audit_logs.at(
      superAdminConnection,
      {
        logId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(auditLog);
  // Step 3: Validate audit log structure and content
  TestValidator.predicate(
    "audit log has valid id",
    typia.is<string & tags.Format<"uuid">>(auditLog.id),
  );
  TestValidator.predicate(
    "audit log has superAdmin entity",
    auditLog.superAdmin !== null && auditLog.superAdmin !== undefined,
  );
  TestValidator.predicate(
    "audit log has action type",
    typeof auditLog.actionType === "string",
  );
  TestValidator.predicate(
    "audit log has description",
    typeof auditLog.description === "string",
  );
  TestValidator.predicate(
    "audit log has target type",
    auditLog.targetType === null || typeof auditLog.targetType === "string",
  );
  TestValidator.predicate(
    "audit log has target id",
    auditLog.targetId === null ||
      typia.is<string & tags.Format<"uuid">>(auditLog.targetId),
  );
  TestValidator.predicate(
    "audit log has IP address",
    typeof auditLog.ipAddress === "string",
  );
  TestValidator.predicate(
    "audit log has user agent",
    typeof auditLog.userAgent === "string",
  );
  TestValidator.predicate(
    "audit log has creation timestamp",
    typia.is<string & tags.Format<"date-time">>(auditLog.createdAt),
  );
}
