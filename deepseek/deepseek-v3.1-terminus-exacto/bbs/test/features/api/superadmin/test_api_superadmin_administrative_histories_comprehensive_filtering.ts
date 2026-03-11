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

export async function test_api_superadmin_administrative_histories_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection using available utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test comprehensive filtering with all criteria
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date().toISOString();
  const comprehensiveFilter: IDiscussionBoardAdministrativeHistory.IRequest = {
    action_type: "request_approval",
    target_type: "admin_request",
    search: "administrative",
    start_date: startDate,
    end_date: endDate,
    page: 1,
    limit: 10,
  };
  const comprehensiveResult =
    await api.functional.discussionBoard.superAdmin.administrative_histories.index(
      superAdminConnection,
      {
        body: comprehensiveFilter,
      },
    );
  typia.assert(comprehensiveResult);
  // Test pagination functionality with specific validations
  TestValidator.predicate(
    "pagination structure exists",
    comprehensiveResult.pagination !== undefined,
  );
  TestValidator.equals(
    "current page matches request",
    comprehensiveResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    comprehensiveResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    comprehensiveResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    comprehensiveResult.pagination.pages >= 0,
  );
  // Test invalid date range (start_date after end_date)
  const invalidDateFilter: IDiscussionBoardAdministrativeHistory.IRequest = {
    start_date: endDate,
    end_date: startDate,
    page: 1,
    limit: 10,
  };
  const invalidDateResult =
    await api.functional.discussionBoard.superAdmin.administrative_histories.index(
      superAdminConnection,
      {
        body: invalidDateFilter,
      },
    );
  typia.assert(invalidDateResult);
  // Test empty search text
  const emptySearchFilter: IDiscussionBoardAdministrativeHistory.IRequest = {
    search: "",
    page: 1,
    limit: 10,
  };
  const emptySearchResult =
    await api.functional.discussionBoard.superAdmin.administrative_histories.index(
      superAdminConnection,
      {
        body: emptySearchFilter,
      },
    );
  typia.assert(emptySearchResult);
  // Test different pagination scenarios
  const paginationTestFilter: IDiscussionBoardAdministrativeHistory.IRequest = {
    page: 2,
    limit: 5,
  };
  const paginationResult =
    await api.functional.discussionBoard.superAdmin.administrative_histories.index(
      superAdminConnection,
      {
        body: paginationTestFilter,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "page 2 requested",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit 5 requested",
    paginationResult.pagination.limit,
    5,
  );
  // Test minimal filtering criteria
  const minimalFilter: IDiscussionBoardAdministrativeHistory.IRequest = {
    page: 1,
    limit: 5,
  };
  const minimalResult =
    await api.functional.discussionBoard.superAdmin.administrative_histories.index(
      superAdminConnection,
      {
        body: minimalFilter,
      },
    );
  typia.assert(minimalResult);
  // Validate pagination calculations when records exist
  if (minimalResult.pagination.records > 0) {
    const expectedPages = Math.ceil(
      minimalResult.pagination.records / minimalResult.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      minimalResult.pagination.pages,
      expectedPages,
    );
  }
  // Test action_type filtering specifically
  const actionTypeFilter: IDiscussionBoardAdministrativeHistory.IRequest = {
    action_type: "user_ban",
    page: 1,
    limit: 10,
  };
  const actionTypeResult =
    await api.functional.discussionBoard.superAdmin.administrative_histories.index(
      superAdminConnection,
      {
        body: actionTypeFilter,
      },
    );
  typia.assert(actionTypeResult);
  // Test target_type filtering specifically
  const targetTypeFilter: IDiscussionBoardAdministrativeHistory.IRequest = {
    target_type: "user_ban",
    page: 1,
    limit: 10,
  };
  const targetTypeResult =
    await api.functional.discussionBoard.superAdmin.administrative_histories.index(
      superAdminConnection,
      {
        body: targetTypeFilter,
      },
    );
  typia.assert(targetTypeResult);
}
