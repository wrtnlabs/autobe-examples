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

export async function test_api_admin_administrative_histories_search_all_records(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as administrator using utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // Test 1: Search with empty criteria (should return all records)
  const emptySearch =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns pagination data",
    emptySearch.pagination !== undefined,
  );
  // Test 2: Search with specific action type filter
  const actionTypeSearch =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      adminConnection,
      {
        body: {
          action_type: "request_approval",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(actionTypeSearch);
  // Test 3: Search with date range filter
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date().toISOString();
  const dateRangeSearch =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      adminConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  // Test 4: Search with text query
  const textSearch =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      adminConnection,
      {
        body: {
          search: "approval",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(textSearch);
  // Test 5: Search with administrator ID filter
  const adminIdSearch =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      adminConnection,
      {
        body: {
          administrator_id: admin.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(adminIdSearch);
  // Test 6: Search with multiple filter combinations
  const combinedSearch =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      adminConnection,
      {
        body: {
          action_type: "user_ban",
          target_type: "user_ban",
          start_date: startDate,
          end_date: endDate,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    emptySearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    emptySearch.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    emptySearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    emptySearch.pagination.pages >= 0,
  );
  // Validate record structure
  if (emptySearch.data.length > 0) {
    const record = emptySearch.data[0];
    TestValidator.predicate("record has id", typeof record.id === "string");
    TestValidator.predicate(
      "record has action_type",
      typeof record.action_type === "string",
    );
    TestValidator.predicate(
      "record has target_type",
      typeof record.target_type === "string",
    );
    TestValidator.predicate(
      "record has target_id",
      typeof record.target_id === "string",
    );
    TestValidator.predicate(
      "record has created_at",
      typeof record.created_at === "string",
    );
  }
}
