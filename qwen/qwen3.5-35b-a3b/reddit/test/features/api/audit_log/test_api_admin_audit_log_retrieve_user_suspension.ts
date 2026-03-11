import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_admin_audit_log_retrieve_user_suspension(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Retrieve audit log by logId
  const logId = typia.random<string & tags.Format<"uuid">>();
  const auditLog =
    await api.functional.redditPlatform.admin.audit_logs.getByLogid(
      adminConnection,
      { logId },
    );
  typia.assert(auditLog);
  // 3. Validate audit log fields exist and have correct types
  TestValidator.equals("audit log id", auditLog.id, logId);
  TestValidator.predicate(
    "action type exists",
    auditLog.actionType !== undefined && auditLog.actionType !== null,
  );
  TestValidator.predicate(
    "action status exists",
    auditLog.actionStatus !== undefined && auditLog.actionStatus !== null,
  );
  TestValidator.predicate(
    "creation timestamp is valid",
    new Date(auditLog.createdAt).getTime() > 0,
  );
  // 4. Validate admin reference (required field)
  TestValidator.equals(
    "admin id exists",
    auditLog.admin.id !== undefined,
    true,
  );
  TestValidator.equals(
    "admin username exists",
    auditLog.admin.username.length > 0,
    true,
  );
  TestValidator.equals(
    "admin display_name exists",
    auditLog.admin.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "admin email is valid email",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(auditLog.admin.email),
    true,
  );
  TestValidator.equals(
    "admin is_active is boolean",
    typeof auditLog.admin.is_active === "boolean",
    true,
  );
  // 5. Validate optional fields (ipAddress, userAgent, referrer can be null)
  if (auditLog.ipAddress) {
    TestValidator.equals(
      "ip address exists",
      typeof auditLog.ipAddress === "string",
      true,
    );
  }
  if (auditLog.userAgent) {
    TestValidator.equals(
      "user agent exists",
      typeof auditLog.userAgent === "string",
      true,
    );
  }
  if (auditLog.referrer) {
    TestValidator.equals(
      "referrer exists",
      typeof auditLog.referrer === "string",
      true,
    );
  }
  // 6. Validate session (optional field)
  if (auditLog.session) {
    TestValidator.equals(
      "session id exists",
      auditLog.session.id !== undefined,
      true,
    );
    TestValidator.equals(
      "session ip exists",
      auditLog.session.ip.length > 0,
      true,
    );
    TestValidator.predicate(
      "session createdAt is valid",
      new Date(auditLog.session.createdAt).getTime() > 0,
    );
    TestValidator.predicate(
      "session expiredAt is valid",
      new Date(auditLog.session.expiredAt).getTime() > 0,
    );
  }
  // 7. Validate optional target entity fields
  if (auditLog.targetEntityType) {
    TestValidator.predicate(
      "target entity type is string",
      auditLog.targetEntityType.length > 0,
    );
  }
  if (auditLog.targetEntityId) {
    TestValidator.equals(
      "target entity id is valid uuid",
      auditLog.targetEntityId.length === 36,
      true,
    );
  }
  // 8. Validate optional action details
  if (auditLog.actionDetails) {
    TestValidator.equals(
      "action details is string",
      typeof auditLog.actionDetails === "string",
      true,
    );
  }
}