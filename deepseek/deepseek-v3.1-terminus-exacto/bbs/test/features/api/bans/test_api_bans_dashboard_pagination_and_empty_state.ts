import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination behavior and empty state scenarios for the bans dashboard.
 * As an administrator, test pagination controls by varying page size (limit parameter)
 * and navigating through multiple pages of results. Verify that pagination metadata
 * (current page, limit, total records, total pages) accurately reflects the dataset.
 * Test edge cases: requesting a page beyond available results returns empty data
 * array with correct pagination metadata. Test filtering criteria that yield zero
 * results to verify proper handling of empty states.
 */
export async function test_api_bans_dashboard_pagination_and_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test empty state with no bans
  const emptyResponse =
    await api.functional.discussionBoard.admin.bans.dashboard.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals("empty data array", emptyResponse.data.length, 0);
  TestValidator.equals(
    "total records zero",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals("total pages zero", emptyResponse.pagination.pages, 0);
  TestValidator.equals("current page 1", emptyResponse.pagination.current, 1);
  TestValidator.equals("limit 10", emptyResponse.pagination.limit, 10);
  // Test pagination with non-existent page
  const beyondPageResponse =
    await api.functional.discussionBoard.admin.bans.dashboard.index(
      adminConnection,
      {
        body: {
          page: 100,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  TestValidator.equals(
    "beyond page empty data",
    beyondPageResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "beyond page has valid pagination",
    beyondPageResponse.pagination.pages >= 0 &&
      beyondPageResponse.pagination.records >= 0,
  );
  // Test different page sizes
  const smallPageResponse =
    await api.functional.discussionBoard.admin.bans.dashboard.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(smallPageResponse);
  TestValidator.equals(
    "small page limit",
    smallPageResponse.pagination.limit,
    5,
  );
  const largePageResponse =
    await api.functional.discussionBoard.admin.bans.dashboard.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(largePageResponse);
  TestValidator.equals(
    "large page limit",
    largePageResponse.pagination.limit,
    50,
  );
  // Test filtering with empty results using valid string
  const filteredEmptyResponse =
    await api.functional.discussionBoard.admin.bans.dashboard.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          reason: "nonexistent_reason_filter_that_will_return_empty",
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(filteredEmptyResponse);
  TestValidator.equals(
    "filtered empty data",
    filteredEmptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "filtered total records zero",
    filteredEmptyResponse.pagination.records,
    0,
  );
  // Test pagination metadata consistency
  TestValidator.predicate(
    "current page valid",
    emptyResponse.pagination.current >= 1 &&
      emptyResponse.pagination.current <= emptyResponse.pagination.pages,
  );
  TestValidator.predicate(
    "limit within bounds",
    emptyResponse.pagination.limit >= 1 &&
      emptyResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records non-negative",
    emptyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    emptyResponse.pagination.pages >= 0,
  );
  // Test pagination calculation
  if (emptyResponse.pagination.records > 0) {
    const expectedPages = Math.ceil(
      emptyResponse.pagination.records / emptyResponse.pagination.limit,
    );
    TestValidator.equals(
      "pagination calculation",
      emptyResponse.pagination.pages,
      expectedPages,
    );
  }
}
