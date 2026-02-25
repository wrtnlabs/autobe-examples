import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminHierarchyAction";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminHierarchyAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_admin_hierarchy_actions_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a user to access the admin hierarchy actions audit trail
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Query for all actions without date filter to establish baseline
  const allActions =
    await api.functional.discussionBoard.user.adminHierarchyActions.index(
      userConnection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardAdminHierarchyAction.IRequest,
      },
    );
  typia.assert(allActions);
  // 3. Test with only created_at_from (open-ended start - all actions from a date onwards)
  const dateFrom = new Date("2020-01-01T00:00:00Z").toISOString();
  const actionsFromOnly =
    await api.functional.discussionBoard.user.adminHierarchyActions.index(
      userConnection,
      {
        body: {
          created_at_from: dateFrom,
          limit: 100,
        } satisfies IDiscussionBoardAdminHierarchyAction.IRequest,
      },
    );
  typia.assert(actionsFromOnly);
  // Verify all returned records have createdAt >= created_at_from
  for (const action of actionsFromOnly.data) {
    TestValidator.predicate(
      "createdAt should be on or after created_at_from",
      new Date(action.createdAt) >= new Date(dateFrom),
    );
  }
  // 4. Test with only created_at_to (open-ended end - all actions up to a date)
  const dateTo = new Date("2030-12-31T23:59:59Z").toISOString();
  const actionsToOnly =
    await api.functional.discussionBoard.user.adminHierarchyActions.index(
      userConnection,
      {
        body: {
          created_at_to: dateTo,
          limit: 100,
        } satisfies IDiscussionBoardAdminHierarchyAction.IRequest,
      },
    );
  typia.assert(actionsToOnly);
  // Verify all returned records have createdAt <= created_at_to
  for (const action of actionsToOnly.data) {
    TestValidator.predicate(
      "createdAt should be on or before created_at_to",
      new Date(action.createdAt) <= new Date(dateTo),
    );
  }
  // 5. Test with both bounds for a specific date range window
  const rangeStart = new Date("2024-01-01T00:00:00Z").toISOString();
  const rangeEnd = new Date("2025-12-31T23:59:59Z").toISOString();
  const actionsWithinRange =
    await api.functional.discussionBoard.user.adminHierarchyActions.index(
      userConnection,
      {
        body: {
          created_at_from: rangeStart,
          created_at_to: rangeEnd,
          limit: 100,
        } satisfies IDiscussionBoardAdminHierarchyAction.IRequest,
      },
    );
  typia.assert(actionsWithinRange);
  // Verify all returned records have createdAt within the range
  for (const action of actionsWithinRange.data) {
    const actionDate = new Date(action.createdAt);
    TestValidator.predicate(
      "createdAt should be within date range bounds",
      actionDate >= new Date(rangeStart) && actionDate <= new Date(rangeEnd),
    );
  }
  // 6. Verify that using date filters correctly reduces result set
  // Actions with both bounds should be subset of actions with only from
  TestValidator.predicate(
    "actions within range should be fewer or equal to actions from start",
    actionsWithinRange.pagination.records <= actionsFromOnly.pagination.records,
  );
}
