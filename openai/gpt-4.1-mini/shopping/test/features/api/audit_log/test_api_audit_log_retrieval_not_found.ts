import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_audit_log_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID that does not exist in audit logs
  const nonExistingId = typia.random<string & tags.Format<"uuid">>();
  // Expect an HttpError with status 404 when retrieving non-existing audit log
  await TestValidator.httpError("audit log not found", 404, async () => {
    await api.functional.shoppingMall.auditLogs.at(adminConnection, {
      id: nonExistingId,
    });
  });
}
