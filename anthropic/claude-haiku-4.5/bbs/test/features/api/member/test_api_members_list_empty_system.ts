import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

export async function test_api_members_list_empty_system(
  connection: api.IConnection,
) {
  // Test 1: Basic member list request with empty results
  const basicListResponse = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(basicListResponse);

  // Verify pagination structure
  TestValidator.equals(
    "pagination object exists",
    basicListResponse.pagination !== null &&
      basicListResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(basicListResponse.data),
    true,
  );
  TestValidator.equals("data is empty", basicListResponse.data.length, 0);
  TestValidator.equals(
    "total records is zero",
    basicListResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages is zero",
    basicListResponse.pagination.pages,
    0,
  );

  // Test 2: List with search filter on empty system
  const searchResponse = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: "nonexistent",
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(searchResponse);
  TestValidator.equals(
    "search returns empty data",
    searchResponse.data.length,
    0,
  );
  TestValidator.equals(
    "search shows zero records",
    searchResponse.pagination.records,
    0,
  );

  // Test 3: List with single account status filter
  const statusFilterResponse =
    await api.functional.discussionBoard.members.index(connection, {
      body: {
        account_status: ["active"],
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(statusFilterResponse);
  TestValidator.equals(
    "active status filter returns empty",
    statusFilterResponse.data.length,
    0,
  );
  TestValidator.equals(
    "active status pagination correct",
    statusFilterResponse.pagination.records,
    0,
  );

  // Test 4: List with email verification filter
  const emailVerifiedResponse =
    await api.functional.discussionBoard.members.index(connection, {
      body: {
        email_verified: true,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(emailVerifiedResponse);
  TestValidator.equals(
    "verified email filter returns empty",
    emailVerifiedResponse.data.length,
    0,
  );

  // Test 5: List with sorting parameters
  const sortedResponse = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        sort_by: "display_name",
        sort_order: "asc",
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(sortedResponse);
  TestValidator.equals(
    "sorted display name returns empty",
    sortedResponse.data.length,
    0,
  );
  TestValidator.equals(
    "sorted pagination shows zero",
    sortedResponse.pagination.records,
    0,
  );

  // Test 6: List with pagination parameters
  const paginatedResponse = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated request returns empty data",
    paginatedResponse.data.length,
    0,
  );
  TestValidator.equals(
    "paginated total records is zero",
    paginatedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "paginated total pages is zero",
    paginatedResponse.pagination.pages,
    0,
  );

  // Test 7: List with multiple filters combined
  const combinedResponse = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: "test",
        account_status: ["active", "suspended"],
        email_verified: false,
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(combinedResponse);
  TestValidator.equals(
    "combined filters return empty data",
    combinedResponse.data.length,
    0,
  );
  TestValidator.equals(
    "combined filters show zero records",
    combinedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filters show zero pages",
    combinedResponse.pagination.pages,
    0,
  );

  // Test 8: Verify response structure integrity with all parameters
  TestValidator.predicate(
    "pagination current is non-negative",
    basicListResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    paginatedResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    combinedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    combinedResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array maintains structure",
    Array.isArray(combinedResponse.data),
  );
}
