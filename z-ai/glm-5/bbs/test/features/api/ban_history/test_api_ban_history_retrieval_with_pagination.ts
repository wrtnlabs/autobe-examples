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

export async function test_api_ban_history_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate via join
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  // 2. Retrieve ban history for the user with default pagination
  const banHistoryPage1 =
    await api.functional.discussionBoard.user.users.ban_histories.index(
      userConnection,
      {
        userId: authorizedUser.id,
        body: {} satisfies IDiscussionBoardBanHistory.IRequest,
      },
    );
  typia.assert(banHistoryPage1);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "current page is valid",
    banHistoryPage1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    banHistoryPage1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is valid",
    banHistoryPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    banHistoryPage1.pagination.pages >= 0,
  );
  // 4. Test pagination with explicit page and limit
  const banHistoryWithLimit =
    await api.functional.discussionBoard.user.users.ban_histories.index(
      userConnection,
      {
        userId: authorizedUser.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardBanHistory.IRequest,
      },
    );
  typia.assert(banHistoryWithLimit);
  // 5. Verify limit is applied correctly
  TestValidator.equals(
    "limit matches request",
    banHistoryWithLimit.pagination.limit,
    5,
  );
  TestValidator.equals(
    "current page is 1",
    banHistoryWithLimit.pagination.current,
    1,
  );
  // 6. Validate sorting order (most recent first - descending by createdAt)
  if (banHistoryPage1.data.length > 1) {
    for (let i = 0; i < banHistoryPage1.data.length - 1; i++) {
      const currentCreatedAt = new Date(
        banHistoryPage1.data[i].createdAt,
      ).getTime();
      const nextCreatedAt = new Date(
        banHistoryPage1.data[i + 1].createdAt,
      ).getTime();
      TestValidator.predicate(
        `records sorted by createdAt descending at index ${i}`,
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
  // 7. Test filtering by action_type
  const banHistoryFiltered =
    await api.functional.discussionBoard.user.users.ban_histories.index(
      userConnection,
      {
        userId: authorizedUser.id,
        body: {
          action_type: "BAN",
        } satisfies IDiscussionBoardBanHistory.IRequest,
      },
    );
  typia.assert(banHistoryFiltered);
  // 8. Verify all filtered records have action_type BAN
  for (const record of banHistoryFiltered.data) {
    TestValidator.equals("action_type is BAN", record.actionType, "BAN");
  }
}
