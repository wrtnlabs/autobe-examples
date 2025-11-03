import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformKarmaAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaAuditLogs";

/**
 * Validate that an authenticated admin can access karma audit log details by
 * auditLogId, and that unauthorized or unauthenticated requests are denied.
 *
 * 1. Register a new admin via /auth/admin/join (receives token and context)
 * 2. Generate a fake 'auditLogId' (since no creation method is present, use
 *    typia.random)
 * 3. Access /communityPlatform/admin/karmaAuditLogs/{auditLogId} as the admin
 *    (should succeed with full payload)
 * 4. Confirm output has critical audit log fields (action, score_delta,
 *    prior_karma, resulting_karma, reason, timestamps, references)
 * 5. Make the same request with no auth (connection.headers: {}) and expect access
 *    denied (TestValidator.error)
 *
 * Note: Non-admin context is not feasible without an endpoint for non-admin
 * auth, so test only unauthenticated denial.
 */
export async function test_api_admin_karma_audit_log_detail_access_admin_context(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://admin.test/autotest", // For audit trail
    referrer: "https://referrer.test",
    ip: null,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Generate a random auditLogId (simulate, since we can't create logs directly)
  const auditLogId = typia.random<string & tags.Format<"uuid">>();

  // 3. Access audit log detail with authenticated admin (should succeed)
  const auditLog: ICommunityPlatformKarmaAuditLogs =
    await api.functional.communityPlatform.admin.karmaAuditLogs.at(connection, {
      auditLogId,
    });
  typia.assert(auditLog);

  // 4. Check required audit log fields exist (type validated by typia.assert)
  TestValidator.predicate(
    "audit log id matches UUID",
    typeof auditLog.id === "string" && auditLog.id.length > 0,
  );
  TestValidator.predicate(
    "has action type",
    typeof auditLog.action === "string" && auditLog.action.length > 0,
  );
  TestValidator.predicate(
    "has score delta",
    typeof auditLog.score_delta === "number",
  );
  TestValidator.predicate(
    "has prior karma",
    typeof auditLog.prior_karma === "number",
  );
  TestValidator.predicate(
    "has resulting karma",
    typeof auditLog.resulting_karma === "number",
  );
  TestValidator.predicate(
    "has created_at date",
    typeof auditLog.created_at === "string" &&
      auditLog.created_at.includes("T"),
  );
  TestValidator.predicate("has reason", typeof auditLog.reason === "string");

  // 5. Attempt unauthenticated access (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to karma audit log is denied",
    async () => {
      await api.functional.communityPlatform.admin.karmaAuditLogs.at(
        unauthConn,
        { auditLogId },
      );
    },
  );
}
