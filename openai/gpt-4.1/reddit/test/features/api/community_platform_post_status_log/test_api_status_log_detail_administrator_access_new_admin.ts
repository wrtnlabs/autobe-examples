import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostStatusLog";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Validate administrator audit access for post status log drilldown.
 *
 * This test ensures that a newly registered administrator, after successfully
 * completing the join flow, can directly access detailed records of post status
 * logs. The scenario mimics system-wide audit where a privileged actor must
 * have unfettered access to sensitive workflow and moderation events.
 *
 * Steps:
 *
 * 1. Register a new administrator account (join).
 * 2. Immediately fetch a post status log record using random postId and
 *    statusLogId.
 * 3. Confirm the detail retrieval returns all fields from the post status log
 *    schema and is not restricted for the freshly created admin.
 * 4. Validate audit-level access and schema conformity, ensuring correct
 *    relationship references and accurate response.
 */
export async function test_api_status_log_detail_administrator_access_new_admin(
  connection: api.IConnection,
) {
  // 1. Register a new administrator (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);
  TestValidator.equals(
    "admin join returned correct email",
    admin.email,
    adminEmail,
  );

  // 2. Fetch a post status log detail as the new administrator account
  const postId = typia.random<string & tags.Format<"uuid">>();
  const statusLogId = typia.random<string & tags.Format<"uuid">>();
  const statusLog: ICommunityPlatformPostStatusLog =
    await api.functional.communityPlatform.administrator.posts.statusLogs.at(
      connection,
      {
        postId,
        statusLogId,
      },
    );
  typia.assert(statusLog);

  // 3. Validate returned log contains the required relationships and schema fields
  TestValidator.equals("log has correct post id", statusLog.post.id, postId);
  TestValidator.equals(
    "log has correct statusLogId",
    statusLog.id,
    statusLogId,
  );
  TestValidator.predicate(
    "log includes actor (user) reference",
    !!statusLog.user && !!statusLog.user.id,
  );
  TestValidator.predicate(
    "log includes session reference",
    !!statusLog.userSession && !!statusLog.userSession.id,
  );
  TestValidator.predicate(
    "log new_status is present",
    typeof statusLog.new_status === "string" && statusLog.new_status.length > 0,
  );
  TestValidator.predicate(
    "log created_at is present",
    typeof statusLog.created_at === "string" && statusLog.created_at.length > 0,
  );
}
