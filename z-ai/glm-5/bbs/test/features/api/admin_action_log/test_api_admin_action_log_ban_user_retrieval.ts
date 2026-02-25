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
 * Test retrieving a detailed admin action log entry for a user ban action.
 *
 * This test validates:
 * 1. Admin action log retrieval endpoint accessibility
 * 2. BAN_USER action logs have correct structure and properties
 * 3. originalAuthor is null for user management actions (not content-related)
 * 4. Reason field is populated for ban actions (business rule: 10-1000 characters)
 */
export async function test_api_admin_action_log_ban_user_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // Retrieve admin action log for a BAN_USER action
  // Note: In production test environment, adminActionLogId would reference
  // an actual ban action created by an administrator
  const adminActionLogId = typia.random<string & tags.Format<"uuid">>();
  const log = await api.functional.discussionBoard.user.adminActionLogs.at(
    userConnection,
    { adminActionLogId },
  );
  typia.assert(log);
  // Validate the response structure for BAN_USER action
  TestValidator.equals("action type is BAN_USER", log.actionType, "BAN_USER");
  TestValidator.equals("target type is USER", log.targetType, "USER");
  // Validate originalAuthor is null for user ban actions
  // BAN_USER actions are not content-related, so originalAuthor should be null
  TestValidator.predicate(
    "originalAuthor is null for BAN_USER",
    log.originalAuthor === null || log.originalAuthor === undefined,
  );
  // Validate reason is populated for ban actions (business rule: 10-1000 chars)
  TestValidator.predicate(
    "reason is populated for ban action",
    log.reason !== null &&
      log.reason !== undefined &&
      log.reason.length >= 10 &&
      log.reason.length <= 1000,
  );
}
