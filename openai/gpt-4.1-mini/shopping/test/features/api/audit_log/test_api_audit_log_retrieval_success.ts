import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_audit_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create adminConnection from base connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Generate a random UUID for audit log id
  const id = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the audit log entry by this id
  const auditLog = await api.functional.shoppingMall.auditLogs.at(
    adminConnection,
    {
      id,
    },
  );
  // 4. Assert the response to conform to IShoppingMallAdministratorAuditLog
  typia.assert(auditLog);
  // 5. Validate presence of key fields (should exist by contract, so just check typia.assert is enough)
  // Additional business validations are not possible because the schema is empty, so just ensure non-null
  TestValidator.predicate(
    "audit log has event_type",
    typeof (auditLog as any).event_type === "string",
  );
  TestValidator.predicate(
    "audit log has description",
    typeof (auditLog as any).description === "string",
  );
  TestValidator.predicate(
    "audit log has actor_type",
    typeof (auditLog as any).actor_type === "string",
  );
  TestValidator.predicate(
    "audit log has actor_id",
    typeof (auditLog as any).actor_id === "string",
  );
  TestValidator.predicate(
    "audit log has ip",
    typeof (auditLog as any).ip === "string",
  );
  TestValidator.predicate(
    "audit log has user_agent",
    typeof (auditLog as any).user_agent === "string",
  );
  TestValidator.predicate(
    "audit log has metadata",
    typeof (auditLog as any).metadata === "object",
  );
  TestValidator.predicate(
    "audit log has created_at",
    typeof (auditLog as any).created_at === "string",
  );
  TestValidator.predicate(
    "audit log has updated_at",
    typeof (auditLog as any).updated_at === "string",
  );
  TestValidator.predicate(
    "audit log has deleted_at",
    (auditLog as any).deleted_at === null ||
      typeof (auditLog as any).deleted_at === "string",
  );
}
