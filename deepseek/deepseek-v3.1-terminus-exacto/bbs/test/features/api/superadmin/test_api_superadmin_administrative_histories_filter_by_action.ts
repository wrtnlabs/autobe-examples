import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrativeHistory";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrativeHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_administrative_histories_filter_by_action(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Test filtering by action_type
  const actionTypes = [
    "request_approval",
    "user_ban",
    "role_promotion",
  ] as const;
  for (const actionType of actionTypes) {
    const filteredByAction =
      await api.functional.discussionBoard.superAdmin.administrative_histories.index(
        superAdminConnection,
        {
          body: {
            action_type: actionType,
            limit: 10,
            page: 1,
          } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
        },
      );
    typia.assert(filteredByAction);
    // Validate all returned records match the action_type filter
    for (const record of filteredByAction.data) {
      TestValidator.equals(
        `action_type filter ${actionType} matches record`,
        record.action_type,
        actionType,
      );
    }
  }
  // 3. Test filtering by target_type
  const targetTypes = ["admin_request", "user_ban", "administrator"] as const;
  for (const targetType of targetTypes) {
    const filteredByTarget =
      await api.functional.discussionBoard.superAdmin.administrative_histories.index(
        superAdminConnection,
        {
          body: {
            target_type: targetType,
            limit: 10,
            page: 1,
          } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
        },
      );
    typia.assert(filteredByTarget);
    // Validate all returned records match the target_type filter
    for (const record of filteredByTarget.data) {
      TestValidator.equals(
        `target_type filter ${targetType} matches record`,
        record.target_type,
        targetType,
      );
    }
  }
  // 4. Test filtering by administrator_id
  const filteredByAdminId =
    await api.functional.discussionBoard.superAdmin.administrative_histories.index(
      superAdminConnection,
      {
        body: {
          administrator_id: typia.random<string & tags.Format<"uuid">>(),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(filteredByAdminId);
  // 5. Test filtering by search text
  const filteredBySearch =
    await api.functional.discussionBoard.superAdmin.administrative_histories.index(
      superAdminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(5),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(filteredBySearch);
  // 6. Test filtering by date range
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date().toISOString();
  const filteredByDateRange =
    await api.functional.discussionBoard.superAdmin.administrative_histories.index(
      superAdminConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(filteredByDateRange);
  // 7. Test combined filtering with both action_type and target_type
  const combinedFilter =
    await api.functional.discussionBoard.superAdmin.administrative_histories.index(
      superAdminConnection,
      {
        body: {
          action_type: "request_approval",
          target_type: "admin_request",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Validate all returned records match both filters
  for (const record of combinedFilter.data) {
    TestValidator.equals(
      "combined filter action_type matches",
      record.action_type,
      "request_approval",
    );
    TestValidator.equals(
      "combined filter target_type matches",
      record.target_type,
      "admin_request",
    );
  }
  // 8. Test filtering with no matching records
  const noMatchFilter =
    await api.functional.discussionBoard.superAdmin.administrative_histories.index(
      superAdminConnection,
      {
        body: {
          action_type: "non_existent_action",
          target_type: "non_existent_target",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(noMatchFilter);
  // Validate no records returned for non-existent filters
  TestValidator.equals(
    "no matching records for non-existent filters",
    noMatchFilter.data.length,
    0,
  );
  // 9. Test pagination with filtering
  const paginatedFilter =
    await api.functional.discussionBoard.superAdmin.administrative_histories.index(
      superAdminConnection,
      {
        body: {
          action_type: "request_approval",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(paginatedFilter);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination limit matches request",
    paginatedFilter.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination current page matches",
    paginatedFilter.pagination.current === 1,
  );
  // Validate pagination records count reflects filtered subset
  if (paginatedFilter.data.length > 0) {
    TestValidator.predicate(
      "pagination records count reflects filtered subset",
      paginatedFilter.pagination.records <= paginatedFilter.pagination.limit ||
        paginatedFilter.pagination.pages >= 1,
    );
  }
  // Validate all records match the filter
  for (const record of paginatedFilter.data) {
    TestValidator.equals(
      "paginated filter action_type matches",
      record.action_type,
      "request_approval",
    );
  }
}
