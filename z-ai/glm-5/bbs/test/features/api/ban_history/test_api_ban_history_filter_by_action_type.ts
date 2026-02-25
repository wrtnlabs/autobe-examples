import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanHistory";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test filtering ban history records by action type.
 *
 * This test validates that the action_type filter correctly partitions
 * the audit trail data:
 * 1. Authenticate as a user to access the ban history endpoint
 * 2. Request ban history filtered by action_type='BAN' and verify all records have actionType='BAN'
 * 3. Request ban history filtered by action_type='UNBAN' and verify all records have actionType='UNBAN'
 * 4. Request ban history without action_type filter to retrieve all records
 * 5. Validate that each filtered result set includes complete pagination metadata
 */
export async function test_api_ban_history_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  // 2. Request ban history filtered by action_type='BAN'
  const banOnlyResponse =
    await api.functional.discussionBoard.user.users.ban_histories.index(
      userConnection,
      {
        userId: authorized.id,
        body: {
          action_type: "BAN",
        } satisfies IDiscussionBoardBanHistory.IRequest,
      },
    );
  typia.assert(banOnlyResponse);
  // Verify all returned records have actionType='BAN'
  TestValidator.predicate(
    "all records have actionType BAN when filtered",
    banOnlyResponse.data.every((record) => record.actionType === "BAN"),
  );
  // 3. Request ban history filtered by action_type='UNBAN'
  const unbanOnlyResponse =
    await api.functional.discussionBoard.user.users.ban_histories.index(
      userConnection,
      {
        userId: authorized.id,
        body: {
          action_type: "UNBAN",
        } satisfies IDiscussionBoardBanHistory.IRequest,
      },
    );
  typia.assert(unbanOnlyResponse);
  // Verify all returned records have actionType='UNBAN'
  TestValidator.predicate(
    "all records have actionType UNBAN when filtered",
    unbanOnlyResponse.data.every((record) => record.actionType === "UNBAN"),
  );
  // 4. Request ban history without action_type filter (all records)
  const allRecordsResponse =
    await api.functional.discussionBoard.user.users.ban_histories.index(
      userConnection,
      {
        userId: authorized.id,
        body: {} satisfies IDiscussionBoardBanHistory.IRequest,
      },
    );
  typia.assert(allRecordsResponse);
  // 5. Validate pagination metadata exists
  TestValidator.predicate(
    "pagination metadata exists for all records response",
    allRecordsResponse.pagination.current !== undefined &&
      allRecordsResponse.pagination.limit !== undefined &&
      allRecordsResponse.pagination.records !== undefined &&
      allRecordsResponse.pagination.pages !== undefined,
  );
  // Verify pagination is consistent for filtered results
  TestValidator.predicate(
    "pagination metadata exists for BAN filtered response",
    banOnlyResponse.pagination.current !== undefined &&
      banOnlyResponse.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination metadata exists for UNBAN filtered response",
    unbanOnlyResponse.pagination.current !== undefined &&
      unbanOnlyResponse.pagination.limit !== undefined,
  );
}
