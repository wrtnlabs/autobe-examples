import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_audit_log_retrieve_success_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super administrator connection and join
  const superAdminConnection: api.IConnection = { host: connection.host };
  /**
   * IDiscussionBoardSuperAdministrator.IJoin is an empty object by definition.
   * We comply by passing an empty object.
   */
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    { body: {} },
  );
  typia.assert(authorized);
  // Attach token to the connection headers for authenticated requests
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Generate a valid UUID for audit log id
  // Using typia.random to generate a valid UUID string
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the audit log entry using the super administrator connection
  const auditLog =
    await api.functional.discussionBoard.superAdministrator.auditLogs.at(
      superAdminConnection,
      {
        id: auditLogId,
      },
    );
  typia.assert(auditLog);
  // 4. Validate the presence of required columns
  // Use 'any' casting for properties not in IDiscussionBoardAuditLog type
  const auditLogAny = auditLog as any;
  TestValidator.predicate(
    "auditLog has id",
    typeof auditLogAny.id === "string" && auditLogAny.id.length > 0,
  );
  TestValidator.predicate(
    "auditLog has event_type",
    typeof auditLogAny.event_type === "string",
  );
  TestValidator.predicate(
    "auditLog has event_description",
    typeof auditLogAny.event_description === "string",
  );
  TestValidator.predicate(
    "auditLog has created_at",
    typeof auditLogAny.created_at === "string",
  );
  TestValidator.predicate(
    "auditLog has updated_at",
    typeof auditLogAny.updated_at === "string",
  );
  // deleted_at can be null or string
  TestValidator.predicate(
    "auditLog has deleted_at or it's null",
    auditLogAny.deleted_at === null || typeof auditLogAny.deleted_at === "string",
  );
  // 5. If actor_id exists, actor details must be included (check presence and types)
  if (auditLogAny.actor_id !== null && auditLogAny.actor_id !== undefined) {
    TestValidator.predicate(
      "actor_id is string",
      typeof auditLogAny.actor_id === "string",
    );
    // We cannot verify actor details as schema does not specify, so only check non-null
    TestValidator.predicate(
      "actor details exist",
      auditLogAny.actor !== null && auditLogAny.actor !== undefined,
    );
  }
}
