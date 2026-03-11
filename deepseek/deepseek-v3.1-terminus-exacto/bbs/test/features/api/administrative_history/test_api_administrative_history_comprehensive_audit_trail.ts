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

export async function test_api_administrative_history_comprehensive_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Test 1: Retrieve all administrative history records with default pagination
  const allRecords =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.history.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(allRecords);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination structure exists",
    allRecords.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(allRecords.data));
  TestValidator.predicate(
    "current page >= 0",
    allRecords.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit between 1-100",
    allRecords.pagination.limit >= 1 && allRecords.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count >= 0",
    allRecords.pagination.records >= 0,
  );
  TestValidator.predicate("pages count >= 0", allRecords.pagination.pages >= 0);
  // Test 2: Filter by specific action type
  const actionTypes = [
    "request_approval",
    "user_ban",
    "role_promotion",
  ] as const;
  for (const actionType of actionTypes) {
    const filteredByAction =
      await api.functional.discussionBoard.superAdmin.administrator_assignments.history.index(
        superAdminConnection,
        {
          body: {
            action_type: actionType,
          } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
        },
      );
    typia.assert(filteredByAction);
    // Validate all returned records match the filter (if any records returned)
    if (filteredByAction.data.length > 0) {
      for (const record of filteredByAction.data) {
        TestValidator.equals(
          "action type matches filter",
          record.action_type,
          actionType,
        );
      }
    }
  }
  // Test 3: Filter by target type
  const targetTypes = ["admin_request", "administrator"] as const;
  for (const targetType of targetTypes) {
    const filteredByTarget =
      await api.functional.discussionBoard.superAdmin.administrator_assignments.history.index(
        superAdminConnection,
        {
          body: {
            target_type: targetType,
          } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
        },
      );
    typia.assert(filteredByTarget);
    // Validate all returned records match the filter (if any records returned)
    if (filteredByTarget.data.length > 0) {
      for (const record of filteredByTarget.data) {
        TestValidator.equals(
          "target type matches filter",
          record.target_type,
          targetType,
        );
      }
    }
  }
  // Test 4: Test pagination with different page sizes
  const pageSizes = [1, 10, 25, 50] as const;
  for (const limit of pageSizes) {
    const paginatedResults =
      await api.functional.discussionBoard.superAdmin.administrator_assignments.history.index(
        superAdminConnection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
        },
      );
    typia.assert(paginatedResults);
    TestValidator.equals(
      "page size matches request",
      paginatedResults.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "data length <= limit",
      paginatedResults.data.length <= limit,
    );
    TestValidator.predicate(
      "current page is 1",
      paginatedResults.pagination.current === 1,
    );
  }
  // Test 5: Filter by date range
  const startDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const endDate = new Date().toISOString();
  const dateFiltered =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.history.index(
      superAdminConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // Validate records are within date range (only if records exist)
  if (dateFiltered.data.length > 0) {
    for (const record of dateFiltered.data) {
      const recordDate = new Date(record.created_at);
      const start = new Date(startDate);
      const end = new Date(endDate);
      TestValidator.predicate(
        "record date within range",
        recordDate >= start && recordDate <= end,
      );
    }
  }
  // Test 6: Test text search functionality with generic term
  const searchResults =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.history.index(
      superAdminConnection,
      {
        body: {
          search: "a", // Use a common letter to increase chances of matching
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(searchResults);
  // Test search returns valid pagination structure regardless of results
  TestValidator.predicate(
    "search pagination exists",
    searchResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "search data is array",
    Array.isArray(searchResults.data),
  );
  // Test 7: Combined filtering with pagination
  const combinedFilter =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.history.index(
      superAdminConnection,
      {
        body: {
          action_type: "request_approval",
          target_type: "admin_request",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Validate combined filter results (if any records returned)
  if (combinedFilter.data.length > 0) {
    for (const record of combinedFilter.data) {
      TestValidator.equals(
        "action type matches combined filter",
        record.action_type,
        "request_approval",
      );
      TestValidator.equals(
        "target type matches combined filter",
        record.target_type,
        "admin_request",
      );
    }
  }
  TestValidator.predicate(
    "page size matches combined request",
    combinedFilter.pagination.limit === 10,
  );
  TestValidator.predicate(
    "current page is 1",
    combinedFilter.pagination.current === 1,
  );
}
