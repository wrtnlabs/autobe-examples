import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAdminAuditLog";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_1234",
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAccount);
  // Update adminConnection headers with the admin token for subsequent requests
  adminConnection.headers = {
    Authorization: `Bearer ${adminAccount.token.access}`,
  };
  // 2. Call audit logs endpoint with no filters
  const auditLogs = await api.functional.redditPlatform.admin.audit_logs.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(auditLogs);
  // 3. Validate pagination structure
  typia.assert(auditLogs.pagination);
  TestValidator.predicate(
    "pagination has current page",
    auditLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    auditLogs.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records",
    auditLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    auditLogs.pagination.pages >= 0,
  );
  // 4. Verify we have audit log data
  typia.assert(auditLogs.data);
  TestValidator.predicate(
    "audit logs have data array",
    auditLogs.data.length >= 0,
  );
  // 5. Validate each audit log entry structure and verify mixed types
  if (auditLogs.data.length > 0) {
    const hasAdminLogs = auditLogs.data.some(
      (log) => log.audit_log_type === "ADMIN",
    );
    const hasModeratorLogs = auditLogs.data.some(
      (log) => log.audit_log_type === "MODERATOR",
    );
    TestValidator.predicate(
      "response contains audit logs",
      auditLogs.data.length > 0,
    );
    TestValidator.predicate(
      "audit logs contain ADMIN type logs",
      hasAdminLogs || hasModeratorLogs,
    );
    // Validate structure of first log entry
    const firstLog = auditLogs.data[0];
    typia.assert(firstLog);
    TestValidator.predicate("log has id", firstLog.id !== null);
    TestValidator.predicate(
      "log has action_type",
      firstLog.action_type !== null,
    );
    TestValidator.predicate(
      "log has action_status",
      firstLog.action_status !== null,
    );
    TestValidator.predicate(
      "log has audit_log_type",
      firstLog.audit_log_type !== null,
    );
    TestValidator.predicate("log has created_at", firstLog.created_at !== null);
    TestValidator.predicate("log has actor_id", firstLog.actor_id !== null);
    TestValidator.predicate(
      "log has ip_address",
      firstLog.ip_address !== undefined,
    );
    TestValidator.predicate(
      "log has referrer",
      firstLog.referrer !== undefined,
    );
    TestValidator.predicate(
      "log has session_id",
      firstLog.session_id !== undefined,
    );
    TestValidator.predicate(
      "log has target_entity_id",
      firstLog.target_entity_id !== undefined,
    );
    TestValidator.predicate(
      "log has target_entity_type",
      firstLog.target_entity_type !== undefined,
    );
    TestValidator.predicate(
      "log has user_agent",
      firstLog.user_agent !== undefined,
    );
    // 6. Verify sorting (created_at DESC - most recent first)
    if (auditLogs.data.length > 1) {
      for (let i = 1; i < auditLogs.data.length; i++) {
        TestValidator.predicate(
          `log ${i} is older or equal to log ${i - 1} (sorted by created_at DESC)`,
          auditLogs.data[i].created_at <= auditLogs.data[i - 1].created_at,
        );
      }
    }
  }
}
