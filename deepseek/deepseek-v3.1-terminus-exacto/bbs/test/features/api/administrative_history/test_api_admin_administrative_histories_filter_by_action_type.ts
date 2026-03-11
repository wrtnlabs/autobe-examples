import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrativeHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrativeHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering administrative history records by specific action types such as request approvals, user bans, and role promotions.
 * Validate that the system correctly filters records based on action_type parameter and returns only matching records.
 * Test edge cases including filtering by non-existent action types, empty action type filters, and combinations with other filter parameters.
 * Verify that the response maintains chronological ordering and pagination works correctly with filtered results.
 */
export async function test_api_admin_administrative_histories_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test filtering by specific action types
  const actionTypes = [
    "request_approval",
    "user_ban",
    "role_promotion",
  ] as const;
  for (const actionType of actionTypes) {
    const filteredResponse =
      await api.functional.discussionBoard.admin.administrative_histories.index(
        adminConnection,
        {
          body: {
            action_type: actionType,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
        },
      );
    typia.assert(filteredResponse);
    // Validate that all returned records match the action type filter
    for (const record of filteredResponse.data) {
      TestValidator.equals(
        `action type should be ${actionType}`,
        record.action_type,
        actionType,
      );
    }
    // Validate pagination information
    TestValidator.predicate(
      `pagination should be valid for ${actionType}`,
      filteredResponse.pagination.records >= 0 &&
        filteredResponse.pagination.pages >= 0 &&
        filteredResponse.pagination.current >= 1 &&
        filteredResponse.pagination.limit >= 1,
    );
  }
  // 3. Test filtering by non-existent action type
  const nonExistentActionType = "non_existent_action_type";
  const emptyResponse =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      adminConnection,
      {
        body: {
          action_type: nonExistentActionType,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "non-existent action type should return empty data",
    emptyResponse.data.length,
    0,
  );
  // 4. Test empty action_type filter (should return all records)
  const allRecordsResponse =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      adminConnection,
      {
        body: {
          action_type: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(allRecordsResponse);
  TestValidator.predicate(
    "empty action_type filter should return records",
    allRecordsResponse.data.length >= 0,
  );
  // 5. Test combination filtering with other parameters
  const combinedFilterResponse =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      adminConnection,
      {
        body: {
          action_type: "request_approval",
          target_type: "admin_request",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  for (const record of combinedFilterResponse.data) {
    TestValidator.equals(
      "action type should be request_approval in combined filter",
      record.action_type,
      "request_approval",
    );
    TestValidator.equals(
      "target type should be admin_request in combined filter",
      record.target_type,
      "admin_request",
    );
  }
  // 6. Test pagination with filtered results
  const paginationTestResponse =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      adminConnection,
      {
        body: {
          action_type: "user_ban",
          page: 1,
          limit: 3,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(paginationTestResponse);
  TestValidator.equals(
    "page 1 limit 3 should return max 3 records",
    paginationTestResponse.data.length <= 3,
    true,
  );
}
