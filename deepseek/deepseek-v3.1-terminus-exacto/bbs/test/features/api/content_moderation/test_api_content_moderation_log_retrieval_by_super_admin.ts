import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the successful retrieval of a specific content moderation log entry by a super administrator.
 * The scenario validates that a super admin can access detailed moderation audit trail information
 * including moderator details, action type, target content information, and timestamps.
 * The test verifies that all required fields are present in the response and that the log entry
 * corresponds to the requested ID.
 */
export async function test_api_content_moderation_log_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Join as super administrator using utility function
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Generate a random log ID to retrieve
  const logId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the content moderation log entry using super admin connection
  const logEntry =
    await api.functional.discussionBoard.superAdmin.content_moderation_logs.at(
      superAdminConnection,
      { logId },
    );
  typia.assert(logEntry);
  // Validate that the retrieved log entry has the correct ID
  TestValidator.equals("log entry ID matches requested ID", logEntry.id, logId);
}
