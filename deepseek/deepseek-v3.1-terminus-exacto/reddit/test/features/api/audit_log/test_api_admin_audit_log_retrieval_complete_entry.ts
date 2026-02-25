import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful retrieval of a complete audit log entry containing all metadata fields
 * and related entity information. Validates that the audit log record includes actor
 * identification, action details, security tracking, timestamps, success status, and
 * any related entity references.
 */
export async function test_api_admin_audit_log_retrieval_complete_entry(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate a random audit log ID to retrieve
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the audit log entry
  const auditLog = await api.functional.communityPlatform.admin.audit_logs.at(
    adminConnection,
    { auditLogId },
  );
  // Validate the complete response structure - typia.assert performs complete validation
  typia.assert(auditLog);
  // Validate business logic: audit log ID matches the requested ID
  TestValidator.equals("audit log ID matches request", auditLog.id, auditLogId);
  // Validate that required fields contain meaningful data (business logic validation)
  TestValidator.predicate(
    "actor type contains meaningful value",
    auditLog.actor_type.trim().length > 0,
  );
  TestValidator.predicate(
    "action type contains meaningful value",
    auditLog.action_type.trim().length > 0,
  );
  TestValidator.predicate(
    "IP address contains meaningful value",
    auditLog.ip_address.trim().length > 0,
  );
  // Note: All type, format, and constraint validation is handled by typia.assert()
  // No redundant validation needed for UUID format, IP format, date format, etc.
}
