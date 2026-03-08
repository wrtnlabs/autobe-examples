import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAdminAuditLog";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import type { IRedditPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_audit_log_retrieval_immutability(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication context
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Set authentication token on a new connection
  const adminAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // 3. Perform administrative actions to generate audit log entries
  // Retrieve audit logs to ensure at least one entry exists
  const initialLogs =
    await api.functional.redditPlatform.admin.audit_logs.index(
      adminAuthenticatedConnection,
      {
        body: {},
      },
    );
  typia.assert(initialLogs);
  // 4. Select an audit log ID from the returned list
  let auditLogId: string;
  if (initialLogs.data.length === 0) {
    // Create a second admin to generate an audit log entry
    const secondAdminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(secondAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformAdmin.IJoin,
    });
    // Retrieve audit logs again to get the newly created admin's audit log
    const freshLogs =
      await api.functional.redditPlatform.admin.audit_logs.index(
        adminAuthenticatedConnection,
        {
          body: {},
        },
      );
    typia.assert(freshLogs);
    auditLogId = freshLogs.data[0].id;
  } else {
    // Use an existing audit log
    auditLogId = initialLogs.data[0].id;
  }
  // 5. Retrieve the specific audit log entry by ID
  const auditLog =
    await api.functional.redditPlatform.admin.audit_logs.getByAuditlogid(
      adminAuthenticatedConnection,
      {
        auditLogId: auditLogId,
      },
    );
  typia.assert(auditLog);
  // 6. Verify the audit log entry contains complete and immutable information
  // Validate action type exists and is a string
  TestValidator.notEquals(
    "audit log has action type",
    auditLog.action_type,
    "",
  );
  TestValidator.predicate(
    "action type is non-empty",
    () => auditLog.action_type.length > 0,
  );
  // Validate action status exists
  TestValidator.notEquals(
    "audit log has action status",
    auditLog.action_status,
    "",
  );
  // Validate admin information is preserved
  TestValidator.notEquals("admin has ID", auditLog.admin.id, "");
  TestValidator.notEquals("admin has username", auditLog.admin.username, "");
  TestValidator.notEquals(
    "admin has display name",
    auditLog.admin.display_name,
    "",
  );
  TestValidator.notEquals("admin has email", auditLog.admin.email, "");
  TestValidator.predicate("admin is active", () => auditLog.admin.is_active);
  TestValidator.notEquals(
    "admin has creation timestamp",
    auditLog.admin.created_at,
    "",
  );
  // Validate timestamp is preserved
  TestValidator.notEquals(
    "audit log has creation timestamp",
    auditLog.created_at,
    "",
  );
  // Validate IP address field exists (may be null)
  if (auditLog.ip_address !== null) {
    TestValidator.notEquals("IP address is set", auditLog.ip_address, "");
  }
  // Validate user agent field exists (may be null)
  if (auditLog.user_agent !== null) {
    TestValidator.notEquals("user agent is set", auditLog.user_agent, "");
  }
  // Validate referrer field exists (may be null)
  if (auditLog.referrer !== null) {
    TestValidator.notEquals("referrer is set", auditLog.referrer, "");
  }
  // Validate session information if present
  if (auditLog.session !== null && auditLog.session !== undefined) {
    TestValidator.notEquals("session has ID", auditLog.session.id, "");
    TestValidator.notEquals("session has IP", auditLog.session.ip, "");
    TestValidator.notEquals("session has href", auditLog.session.href, "");
    TestValidator.notEquals(
      "session has created_at",
      auditLog.session.created_at,
      "",
    );
  }
  // 7. Verify audit log immutability by retrieving it again
  const auditLogAgain =
    await api.functional.redditPlatform.admin.audit_logs.getByAuditlogid(
      adminAuthenticatedConnection,
      {
        auditLogId: auditLogId,
      },
    );
  typia.assert(auditLogAgain);
  // Validate audit log is unchanged on second retrieval
  TestValidator.equals(
    "action type unchanged",
    auditLog.action_type,
    auditLogAgain.action_type,
  );
  TestValidator.equals(
    "action status unchanged",
    auditLog.action_status,
    auditLogAgain.action_status,
  );
  TestValidator.equals(
    "admin ID unchanged",
    auditLog.admin.id,
    auditLogAgain.admin.id,
  );
  TestValidator.equals(
    "admin username unchanged",
    auditLog.admin.username,
    auditLogAgain.admin.username,
  );
  TestValidator.equals(
    "created timestamp unchanged",
    auditLog.created_at,
    auditLogAgain.created_at,
  );
  TestValidator.equals(
    "target entity type unchanged",
    auditLog.target_entity_type,
    auditLogAgain.target_entity_type,
  );
  TestValidator.equals(
    "target entity ID unchanged",
    auditLog.target_entity_id,
    auditLogAgain.target_entity_id,
  );
  TestValidator.equals(
    "IP address unchanged",
    auditLog.ip_address,
    auditLogAgain.ip_address,
  );
  TestValidator.equals(
    "user agent unchanged",
    auditLog.user_agent,
    auditLogAgain.user_agent,
  );
  TestValidator.equals(
    "referrer unchanged",
    auditLog.referrer,
    auditLogAgain.referrer,
  );
  // Validate session information unchanged (handle nullable)
  if (auditLog.session !== null && auditLog.session !== undefined) {
    TestValidator.equals(
      "session ID unchanged",
      auditLog.session.id,
      auditLogAgain.session?.id ?? "",
    );
  }
  TestValidator.equals(
    "session present/absent consistent",
    auditLog.session !== null && auditLog.session !== undefined,
    auditLogAgain.session !== null && auditLogAgain.session !== undefined,
  );
  // 8. Verify audit logs maintain integrity across multiple queries
  const logsAfterRetrieval =
    await api.functional.redditPlatform.admin.audit_logs.index(
      adminAuthenticatedConnection,
      {
        body: {},
      },
    );
  typia.assert(logsAfterRetrieval);
  // Find the same log ID in the list
  const logInList = logsAfterRetrieval.data.find(
    (log) => log.id === auditLogId,
  );
  TestValidator.predicate(
    "audit log ID in list",
    () => logInList !== undefined,
  );
  if (logInList) {
    TestValidator.equals("log ID in list matches", logInList.id, auditLogId);
    TestValidator.equals(
      "log action type in list matches",
      logInList.action_type,
      auditLog.action_type,
    );
    TestValidator.equals(
      "log status in list matches",
      logInList.action_status,
      auditLog.action_status,
    );
  }
}
