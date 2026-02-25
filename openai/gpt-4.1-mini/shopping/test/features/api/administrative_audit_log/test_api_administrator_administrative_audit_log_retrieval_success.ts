import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrativeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrativeAuditLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrative_audit_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of an existing administrative audit log by its UUID.
  // Create new connection for administrator and join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass1234",
    },
  });
  typia.assert(adminAuth);
  // Request an existing administrative audit log ID using a new random UUID that may exist
  // This test assumes the service has at least one audit log with this UUID or test environment
  const administrativeAuditLogId = typia.random<string & tags.Format<"uuid">>();
  const auditLog =
    await api.functional.shoppingMall.administrator.administrativeAuditLogs.at(
      adminConnection,
      {
        administrativeAuditLogId,
      },
    );
  typia.assert(auditLog);
  // Validate key fields presence and types
  TestValidator.predicate(
    "has valid id format",
    /^[0-9a-f-]{36}$/i.test(auditLog.id),
  );
  TestValidator.predicate(
    "actionType is non-empty string",
    typeof auditLog.actionType === "string" && auditLog.actionType.length > 0,
  );
  TestValidator.predicate(
    "targetEntity is non-empty string",
    typeof auditLog.targetEntity === "string" &&
      auditLog.targetEntity.length > 0,
  );
  TestValidator.predicate(
    "targetId is valid UUID",
    /^[0-9a-f-]{36}$/i.test(auditLog.targetId),
  );
  TestValidator.predicate(
    "actionDescription is non-empty string",
    typeof auditLog.actionDescription === "string" &&
      auditLog.actionDescription.length > 0,
  );
  TestValidator.predicate(
    "createdAt is ISO date-time string",
    typeof auditLog.createdAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        auditLog.createdAt,
      ),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time string",
    typeof auditLog.updatedAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        auditLog.updatedAt,
      ),
  );
  // deletedAt may be null
  TestValidator.predicate(
    "administrator exists and has valid id",
    auditLog.administrator !== null &&
      typeof auditLog.administrator.id === "string" &&
      auditLog.administrator.id.length > 0,
  );
  TestValidator.predicate(
    "administrator email present",
    typeof auditLog.administrator.email === "string" &&
      auditLog.administrator.email.length > 0,
  );
  TestValidator.predicate(
    "administrator name present",
    typeof auditLog.administrator.name === "string" &&
      auditLog.administrator.name.length > 0,
  );
  TestValidator.predicate(
    "administrator isSuperAdmin is boolean",
    typeof auditLog.administrator.isSuperAdmin === "boolean",
  );
  TestValidator.predicate(
    "administrator createdAt is ISO date-time string",
    typeof auditLog.administrator.createdAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        auditLog.administrator.createdAt,
      ),
  );
  TestValidator.predicate(
    "administrator updatedAt is ISO date-time string",
    typeof auditLog.administrator.updatedAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        auditLog.administrator.updatedAt,
      ),
  );
  // deletedAt may be null
}
