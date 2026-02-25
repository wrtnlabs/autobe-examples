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
 * Test retrieval of an audit log entry specifically targeting community-related actions.
 * This scenario focuses on testing the audit log retrieval functionality for community
 * management activities. Since no community creation APIs are available, the test
 * validates the audit log retrieval endpoint with proper authentication.
 */
export async function test_api_admin_audit_log_retrieval_community_action(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Generate a valid audit log ID format for testing retrieval functionality
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the audit log entry (this tests the endpoint functionality)
  const auditLog = await api.functional.communityPlatform.admin.audit_logs.at(
    adminConnection,
    { auditLogId },
  );
  typia.assert(auditLog);
  // 4. Validate basic audit log structure and integrity
  TestValidator.equals("audit log ID matches", auditLog.id, auditLogId);
  TestValidator.predicate(
    "has valid actor type",
    auditLog.actor_type.length > 0,
  );
  TestValidator.predicate(
    "has valid actor ID",
    /^[0-9a-f-]{36}$/i.test(auditLog.actor_id),
  );
  TestValidator.predicate(
    "has valid action type",
    auditLog.action_type.length > 0,
  );
  TestValidator.predicate(
    "has valid IP address",
    /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(auditLog.ip_address),
  );
  TestValidator.predicate(
    "has valid success status",
    typeof auditLog.success === "boolean",
  );
  TestValidator.predicate(
    "has valid creation timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(auditLog.created_at),
  );
  TestValidator.predicate(
    "has valid update timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(auditLog.updated_at),
  );
  // 5. Validate optional entity references (community, post, comment)
  // These are tested for structural integrity when present
  if (auditLog.community !== null && auditLog.community !== undefined) {
    TestValidator.predicate(
      "community has valid ID",
      /^[0-9a-f-]{36}$/i.test(auditLog.community.id),
    );
    TestValidator.predicate(
      "community has valid name",
      auditLog.community.name.length > 0,
    );
    TestValidator.predicate(
      "community has valid description",
      auditLog.community.description.length > 0,
    );
    TestValidator.predicate(
      "community owner has valid ID",
      /^[0-9a-f-]{36}$/i.test(auditLog.community.owner.id),
    );
    TestValidator.predicate(
      "community has valid creation timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        auditLog.community.created_at,
      ),
    );
  }
  if (auditLog.post !== null && auditLog.post !== undefined) {
    TestValidator.predicate(
      "post has valid ID",
      /^[0-9a-f-]{36}$/i.test(auditLog.post.id),
    );
    TestValidator.predicate(
      "post has valid title",
      auditLog.post.title.length > 0,
    );
    TestValidator.predicate(
      "post has valid type",
      auditLog.post.post_type.length > 0,
    );
    TestValidator.predicate(
      "post author has valid ID",
      /^[0-9a-f-]{36}$/i.test(auditLog.post.author.id),
    );
    TestValidator.predicate(
      "post community has valid ID",
      /^[0-9a-f-]{36}$/i.test(auditLog.post.community.id),
    );
    TestValidator.predicate(
      "post has valid creation timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(auditLog.post.created_at),
    );
  }
  if (auditLog.comment !== null && auditLog.comment !== undefined) {
    TestValidator.predicate(
      "comment has valid ID",
      /^[0-9a-f-]{36}$/i.test(auditLog.comment.id),
    );
    TestValidator.predicate(
      "comment has valid content",
      auditLog.comment.content.length > 0 &&
        auditLog.comment.content.length <= 200,
    );
    TestValidator.predicate(
      "comment author has valid ID",
      /^[0-9a-f-]{36}$/i.test(auditLog.comment.author.id),
    );
    TestValidator.predicate(
      "comment post has valid ID",
      /^[0-9a-f-]{36}$/i.test(auditLog.comment.post.id),
    );
    TestValidator.predicate(
      "comment has valid vote score",
      typeof auditLog.comment.vote_score === "number",
    );
    TestValidator.predicate(
      "comment has valid creation timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(auditLog.comment.created_at),
    );
  }
}
