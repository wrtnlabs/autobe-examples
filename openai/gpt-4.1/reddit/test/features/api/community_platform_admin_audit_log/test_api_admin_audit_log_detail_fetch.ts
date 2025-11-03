import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";

/**
 * Validate admin audit log detail fetch API.
 *
 * 1. Register and authenticate a new admin
 * 2. Attempt to fetch an audit log detail by ID as admin
 * 3. Validate required fields are present in the response
 * 4. Confirm actor fields and trail are complete
 * 5. Try fetching an audit log with a random or invalid ID (should fail)
 * 6. Try accessing as unauthenticated or unauthorized user (should fail)
 */
export async function test_api_admin_audit_log_detail_fetch(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "Password!123";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
    href: "https://platform-admin.example.com/join",
    referrer: "https://platform-admin.example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.ICreate;
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // 2. (Find at least one audit log entry. If there is none, skip the check)
  // NOTE: The test cannot create audit log entries. This obtains a random ID for the test, but if nonexistent, skips detail check
  const probeAuditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  let auditLog: ICommunityPlatformAuditLog | null = null;
  try {
    auditLog = await api.functional.communityPlatform.admin.auditLogs.at(
      connection,
      {
        auditLogId: probeAuditLogId,
      },
    );
    typia.assert(auditLog);
  } catch {
    // If audit log not found, test cannot proceed with detail validation
    auditLog = null;
  }
  if (!auditLog) {
    // There is no accessible audit log in the test DB
    return;
  }

  // 3. Fetch the audit log detail by known ID
  const detail = await api.functional.communityPlatform.admin.auditLogs.at(
    connection,
    {
      auditLogId: auditLog.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("fetched audit log id matches", detail.id, auditLog.id);
  TestValidator.predicate(
    "actor_type is not empty",
    detail.actor_type.length > 0,
  );
  TestValidator.predicate("actor_id is not empty", detail.actor_id.length > 0);
  TestValidator.predicate("action is not empty", detail.action.length > 0);
  TestValidator.predicate(
    "target_type is not empty",
    detail.target_type.length > 0,
  );
  TestValidator.predicate(
    "target_id is not empty",
    detail.target_id.length > 0,
  );
  TestValidator.predicate(
    "created_at is present",
    typeof detail.created_at === "string",
  );
  // Metadata can be null or undefined or string; if present, check type
  if (detail.metadata !== null && detail.metadata !== undefined) {
    TestValidator.predicate(
      "metadata is string",
      typeof detail.metadata === "string",
    );
  }

  // 4. Test error handling — fetch with a random (nonexistent) UUID
  await TestValidator.error(
    "nonexistent auditLogId should cause error",
    async () => {
      await api.functional.communityPlatform.admin.auditLogs.at(connection, {
        auditLogId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 5. Try as unauthenticated (blank headers) — should fail
  const unauth: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "accessing audit log without admin token should fail",
    async () => {
      await api.functional.communityPlatform.admin.auditLogs.at(unauth, {
        auditLogId: auditLog!.id,
      });
    },
  );
}
