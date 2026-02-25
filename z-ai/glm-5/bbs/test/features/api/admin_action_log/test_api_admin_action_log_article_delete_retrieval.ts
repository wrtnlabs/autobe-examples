import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminActionLog";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test retrieval of an admin action log entry for article deletion.
 *
 * This test verifies that the admin action log retrieval endpoint returns
 * a properly structured IDiscussionBoardAdminActionLog with all required fields
 * including resolved administrator and originalAuthor relations.
 *
 * Prerequisites:
 * - An admin action log must exist in the system (typically created when
 *   an admin performs ARTICLE_DELETE action)
 */
export async function test_api_admin_action_log_article_delete_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for the admin action log ID
  const adminActionLogId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the admin action log entry
  const log: IDiscussionBoardAdminActionLog =
    await api.functional.discussionBoard.user.adminActionLogs.at(connection, {
      adminActionLogId,
    });
  // Validate the complete response structure
  typia.assert(log);
  // Validate business logic for ARTICLE_DELETE action type
  TestValidator.equals("action type", log.actionType, "ARTICLE_DELETE");
  TestValidator.equals("target type", log.targetType, "ARTICLE");
  // Validate that the administrator relation is populated
  TestValidator.predicate(
    "administrator is resolved",
    log.administrator !== null && log.administrator !== undefined,
  );
  // Validate that originalAuthor is populated for content-related actions
  TestValidator.predicate(
    "original author is resolved for article delete",
    log.originalAuthor !== null && log.originalAuthor !== undefined,
  );
  // Validate UUID format for target ID
  TestValidator.predicate(
    "target ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      log.targetId,
    ),
  );
}
