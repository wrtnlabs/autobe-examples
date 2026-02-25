import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminActionLog";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminActionLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_admin_action_log_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for accessing admin action logs
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(adminConnection, {});
  // Define the action type to filter by
  const actionType = "BAN_USER";
  // Request admin action logs filtered by action_type
  const response =
    await api.functional.discussionBoard.user.adminActionLogs.index(
      adminConnection,
      {
        body: {
          action_type: actionType,
        } satisfies IDiscussionBoardAdminActionLog.IRequest,
      },
    );
  typia.assert(response);
  // Validate that all returned entries have the matching actionType
  for (const log of response.data) {
    TestValidator.equals(
      "actionType matches filter",
      log.actionType,
      actionType,
    );
  }
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination.current is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    response.pagination.pages >= 0,
  );
}
