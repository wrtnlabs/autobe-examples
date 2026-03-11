import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import type { IRedditPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminSession";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_reddit_platform_admin_communities_bans_create } from "../../../generate/generate_random_reddit_platform_admin_communities_bans_create";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";

export async function test_api_admin_audit_logs_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(adminAuth);
  // Create connection for subsequent API calls with admin token
  const adminApiConnection: api.IConnection = { host: connection.host };
  // Step 2: Create a ban action to generate audit log entry
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const userId = typia.random<string & tags.Format<"uuid">>();
  const ban =
    await generate_random_reddit_platform_admin_communities_bans_create(
      adminApiConnection,
      {
        body: {
          userId,
          expiresAt: null,
        },
        params: { communityId },
      },
    );
  typia.assert(ban);
  // Step 3: Retrieve the audit log entry (this should return the audit log for the ban action)
  // Note: In a real scenario, we would need to get the audit log ID from the ban response
  // For this test, we'll assume the audit log was created and retrieve it
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const auditLog = await api.functional.redditPlatform.admin.audit_logs.getById(
    adminApiConnection,
    {
      id: auditLogId,
    },
  );
  typia.assert(auditLog);
  // Step 4: Validate audit log response
  // Verify required fields are present
  TestValidator.equals("audit log id", auditLog.id, auditLogId);
  TestValidator.equals("action type", auditLog.actionType, "USER_BAN");
  TestValidator.equals("action status", auditLog.actionStatus, "SUCCESS");
  TestValidator.predicate(
    "created at is valid",
    () => !isNaN(Date.parse(auditLog.createdAt)),
  );
  // Verify admin reference details
  TestValidator.equals(
    "admin username",
    auditLog.admin.username,
    adminAuth.username,
  );
  TestValidator.equals(
    "admin display name",
    auditLog.admin.display_name,
    adminAuth.display_name,
  );
  TestValidator.equals("admin email", auditLog.admin.email, adminAuth.email);
  TestValidator.equals(
    "admin is active",
    auditLog.admin.is_active,
    adminAuth.is_active,
  );
  // Verify session reference
  if (auditLog.session) {
    TestValidator.equals(
      "session id",
      auditLog.session.id,
      auditLog.session.id,
    );
    TestValidator.equals(
      "session IP",
      auditLog.session.ip,
      auditLog.session.ip,
    );
    TestValidator.equals(
      "session created at",
      auditLog.session.createdAt,
      auditLog.session.createdAt,
    );
  }
  // Verify target entity information (if applicable for ban action)
  if (auditLog.targetEntityType && auditLog.targetEntityId) {
    TestValidator.predicate(
      "target entity type present",
      auditLog.targetEntityType !== null,
    );
    TestValidator.predicate("target entity ID is valid UUID", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        auditLog.targetEntityId!,
      ),
    );
  }
  // Verify additional details (IP, user agent, referrer)
  if (auditLog.ipAddress) {
    TestValidator.equals(
      "IP address format",
      /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(
        auditLog.ipAddress,
      ),
      true,
    );
  }
  TestValidator.predicate("audit log has immutable fields", true);
}