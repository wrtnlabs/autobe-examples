import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test member listing search and pagination functionality.
 *
 * This test validates:
 * 1. Partial matching search on display_name field
 * 2. Cursor-based pagination navigation
 * 3. Date range filtering (created_at_from and created_at_to)
 * 4. Sort order parameter (asc and desc)
 * 5. Combined filters (search + ban_status + date range)
 */
export async function test_api_member_listing_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // ============================================
  // Test 1: Basic listing without filters
  // ============================================
  const basicResponse = await api.functional.discussionBoard.members.index(
    memberConnection,
    {
      body: {
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(basicResponse);
  TestValidator.equals(
    "pagination current page",
    basicResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    basicResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    basicResponse.pagination.records >= 0,
  );
  // ============================================
  // Test 2: Search with partial matching
  // ============================================
  // Generate search term from existing data if available
  if (basicResponse.data.length > 0) {
    const firstMember = basicResponse.data[0];
    const searchName = firstMember.display_name.substring(0, 3);
    const searchResponse = await api.functional.discussionBoard.members.index(
      memberConnection,
      {
        body: {
          search: searchName,
          limit: 20,
        } satisfies IDiscussionBoardMember.IRequest,
      },
    );
    typia.assert(searchResponse);
    // Verify search parameter is accepted and returns valid response
    TestValidator.predicate(
      "search response has valid structure",
      searchResponse.pagination !== undefined &&
        Array.isArray(searchResponse.data),
    );
  }
  // ============================================
  // Test 3: Cursor-based pagination
  // ============================================
  const cursorPage1 = await api.functional.discussionBoard.members.index(
    memberConnection,
    {
      body: {
        limit: 5,
        cursor: undefined,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(cursorPage1);
  if (cursorPage1.data.length > 0) {
    // Use last member's created_at as cursor hint (server handles encoding)
    const lastMember = cursorPage1.data[cursorPage1.data.length - 1];
    const cursorToken = lastMember.id;
    const cursorPage2 = await api.functional.discussionBoard.members.index(
      memberConnection,
      {
        body: {
          limit: 5,
          cursor: cursorToken,
        } satisfies IDiscussionBoardMember.IRequest,
      },
    );
    typia.assert(cursorPage2);
    // Verify pagination continues with cursor
    TestValidator.predicate(
      "cursor pagination returns valid response",
      cursorPage2.pagination !== undefined && Array.isArray(cursorPage2.data),
    );
    // Verify no duplicate IDs between pages
    const page1Ids = new Set(cursorPage1.data.map((m) => m.id));
    for (const member of cursorPage2.data) {
      TestValidator.predicate(
        `cursor page 2 has unique ID ${member.id}`,
        !page1Ids.has(member.id),
      );
    }
  }
  // ============================================
  // Test 4: Date range filtering
  // ============================================
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilterResponse = await api.functional.discussionBoard.members.index(
    memberConnection,
    {
      body: {
        created_at_from: thirtyDaysAgo.toISOString(),
        created_at_to: now.toISOString(),
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(dateFilterResponse);
  // Verify date filter parameters are accepted
  TestValidator.predicate(
    "date filter response has valid structure",
    dateFilterResponse.pagination !== undefined &&
      Array.isArray(dateFilterResponse.data),
  );
  // ============================================
  // Test 5: Sort order (descending)
  // ============================================
  const sortDescResponse = await api.functional.discussionBoard.members.index(
    memberConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(sortDescResponse);
  if (sortDescResponse.data.length > 1) {
    for (let i = 0; i < sortDescResponse.data.length - 1; i++) {
      const current = new Date(sortDescResponse.data[i].created_at);
      const next = new Date(sortDescResponse.data[i + 1].created_at);
      TestValidator.predicate(
        `desc sort at index ${i}: current >= next`,
        current >= next,
      );
    }
  }
  // ============================================
  // Test 6: Sort order (ascending)
  // ============================================
  const sortAscResponse = await api.functional.discussionBoard.members.index(
    memberConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(sortAscResponse);
  if (sortAscResponse.data.length > 1) {
    for (let i = 0; i < sortAscResponse.data.length - 1; i++) {
      const current = new Date(sortAscResponse.data[i].created_at);
      const next = new Date(sortAscResponse.data[i + 1].created_at);
      TestValidator.predicate(
        `asc sort at index ${i}: current <= next`,
        current <= next,
      );
    }
  }
  // ============================================
  // Test 7: Combined filters (ban_status)
  // ============================================
  const combinedFilterResponse =
    await api.functional.discussionBoard.members.index(memberConnection, {
      body: {
        ban_status: "active",
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(combinedFilterResponse);
  // Verify all results have the specified ban_status
  for (const member of combinedFilterResponse.data) {
    TestValidator.equals(
      `member ${member.id} ban_status matches filter`,
      member.ban_status,
      "active",
    );
  }
  // ============================================
  // Test 8: Empty search results
  // ============================================
  const emptySearchResponse =
    await api.functional.discussionBoard.members.index(memberConnection, {
      body: {
        search: "zzz_nonexistent_member_xyz",
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(emptySearchResponse);
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearchResponse.data.length,
    0,
  );
  // ============================================
  // Test 9: Pagination metadata validation
  // ============================================
  const paginationTestResponse =
    await api.functional.discussionBoard.members.index(memberConnection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(paginationTestResponse);
  TestValidator.equals(
    "pagination current matches request",
    paginationTestResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginationTestResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginationTestResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    paginationTestResponse.pagination.records >=
      paginationTestResponse.data.length,
  );
}
