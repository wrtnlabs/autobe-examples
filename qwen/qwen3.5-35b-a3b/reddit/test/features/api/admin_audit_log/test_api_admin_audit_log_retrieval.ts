import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import type { IRedditPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminSession";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformDashboard";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_log_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      username: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminJoinResult);
  // 2. Create authenticated connection for admin
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: adminJoinResult.token.access };
  // 3. Perform admin action (dashboard retrieval) to generate audit log
  const dashboard =
    await api.functional.redditPlatform.admin.dashboard.at(adminConnection);
  typia.assert(dashboard);
  // 4. Retrieve audit log entry
  // Use a random UUID for testing - in real scenario, this would come from the audit log
  const randomLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const auditLog =
    await api.functional.redditPlatform.admin.audit_logs.getByLogid(
      adminConnection,
      { logId: randomLogId },
    );
  typia.assert(auditLog);
  // 5. Validate audit log business logic
  TestValidator.equals(
    "action_type is non-empty string",
    auditLog.action_type.length > 0,
    true,
  );
  TestValidator.equals(
    "action_status is non-empty string",
    auditLog.action_status.length > 0,
    true,
  );
  TestValidator.equals(
    "created_at is valid date-time",
    !isNaN(Date.parse(auditLog.created_at)),
    true,
  );
  // Validate admin details
  TestValidator.equals(
    "admin has display_name",
    auditLog.admin.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "admin username matches",
    auditLog.admin.username.length > 0,
    true,
  );
  TestValidator.equals(
    "admin email is valid format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(auditLog.admin.email),
    true,
  );
  TestValidator.equals(
    "admin created_at is valid",
    !isNaN(Date.parse(auditLog.admin.created_at)),
    true,
  );
  // Validate optional fields based on actual values
  if (auditLog.target_entity_type) {
    TestValidator.predicate(
      "target_entity_type has content",
      auditLog.target_entity_type.length > 0,
    );
  }
  if (auditLog.target_entity_id) {
    TestValidator.predicate(
      "target_entity_id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        auditLog.target_entity_id,
      ),
    );
  }
  if (auditLog.action_details !== null && auditLog.action_details !== undefined) {
    TestValidator.predicate("action_details is valid JSON", () => {
      try {
        JSON.parse(auditLog.action_details ?? "");
        return true;
      } catch {
        return false;
      }
    });
  }
}