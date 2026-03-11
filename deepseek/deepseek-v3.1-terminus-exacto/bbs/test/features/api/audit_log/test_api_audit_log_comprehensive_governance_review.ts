import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_audit_log_comprehensive_governance_review(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using join endpoint to generate audit log
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Since we don't have a way to get specific audit log IDs from the actions performed,
  // we'll test the audit log retrieval endpoint with a valid UUID format
  // This validates that the endpoint works correctly with proper UUID input
  const testLogId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve a specific audit log entry
  const auditLog =
    await api.functional.discussionBoard.superAdmin.audit_logs.at(
      superAdminConnection,
      { logId: testLogId },
    );
  typia.assert(auditLog);
  // Validate business logic aspects of the audit log
  TestValidator.equals(
    "actor_type is valid",
    ["admin", "super_admin"].includes(auditLog.actor_type),
    true,
  );
  TestValidator.predicate(
    "actor_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      auditLog.actor_id,
    ),
  );
  TestValidator.predicate(
    "target_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      auditLog.target_id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    !isNaN(new Date(auditLog.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    !isNaN(new Date(auditLog.updated_at).getTime()),
  );
}
