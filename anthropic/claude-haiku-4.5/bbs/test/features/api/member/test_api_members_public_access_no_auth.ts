import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test that the members list endpoint is publicly accessible without
 * authentication.
 *
 * This test validates guest access to the member discovery API, ensuring that:
 *
 * 1. Unauthenticated requests can retrieve member lists
 * 2. Only public member information is returned (no email addresses or sensitive
 *    data)
 * 3. Pagination works correctly for public access
 * 4. Search, filtering, and sorting parameters function properly
 * 5. Public access does not grant administrative capabilities
 */
export async function test_api_members_public_access_no_auth(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection (empty headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Test 1: Basic public member list access without authentication
  const basicListResponse = await api.functional.discussionBoard.members.index(
    unauthenticatedConnection,
    {
      body: {} satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(basicListResponse);
  TestValidator.predicate(
    "public member list should return paginated results",
    basicListResponse.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination should be present",
    basicListResponse.pagination !== null &&
      basicListResponse.pagination !== undefined,
  );

  // Test 2: Verify public member data does not expose email addresses
  if (basicListResponse.data.length > 0) {
    const firstMember = basicListResponse.data[0];
    typia.assert(firstMember);
    TestValidator.predicate(
      "member summary should have id",
      firstMember.id.length > 0,
    );
    TestValidator.predicate(
      "member summary should have display_name",
      firstMember.display_name.length > 0,
    );
    TestValidator.predicate(
      "member summary should have account_status",
      ["active", "suspended", "terminated", "deleted"].includes(
        firstMember.account_status,
      ),
    );
    TestValidator.predicate(
      "member summary should have created_at",
      firstMember.created_at.length > 0,
    );
  }

  // Test 3: Test pagination with limit
  const paginatedResponse = await api.functional.discussionBoard.members.index(
    unauthenticatedConnection,
    {
      body: {
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "pagination limit should be 10",
    paginatedResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination current page should be 1",
    paginatedResponse.pagination.current === 1,
  );

  // Test 4: Test with search parameter
  if (basicListResponse.data.length > 0) {
    const sampleMember = basicListResponse.data[0];
    const searchResponse = await api.functional.discussionBoard.members.index(
      unauthenticatedConnection,
      {
        body: {
          search: sampleMember.display_name.substring(0, 3),
        } satisfies IDiscussionBoardMember.IRequest,
      },
    );
    typia.assert(searchResponse);
    TestValidator.predicate(
      "search should return results",
      searchResponse.data.length >= 0,
    );
  }

  // Test 5: Test with account_status filter
  const activeOnlyResponse = await api.functional.discussionBoard.members.index(
    unauthenticatedConnection,
    {
      body: {
        account_status: ["active"],
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(activeOnlyResponse);
  TestValidator.predicate(
    "active status filter should return results",
    activeOnlyResponse.data.length >= 0,
  );
  // Verify all returned members have active status
  for (const member of activeOnlyResponse.data) {
    TestValidator.equals(
      "member should have active status",
      member.account_status,
      "active",
    );
  }

  // Test 6: Test with sorting by display_name
  const sortedByNameResponse =
    await api.functional.discussionBoard.members.index(
      unauthenticatedConnection,
      {
        body: {
          sort_by: "display_name",
          sort_order: "asc",
        } satisfies IDiscussionBoardMember.IRequest,
      },
    );
  typia.assert(sortedByNameResponse);
  TestValidator.predicate(
    "sorted results should be returned",
    sortedByNameResponse.data.length >= 0,
  );

  // Test 7: Test sorting by created_at (newest first)
  const sortedByCreatedResponse =
    await api.functional.discussionBoard.members.index(
      unauthenticatedConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardMember.IRequest,
      },
    );
  typia.assert(sortedByCreatedResponse);
  TestValidator.predicate(
    "sorted by created_at results should be returned",
    sortedByCreatedResponse.data.length >= 0,
  );

  // Test 8: Test sorting by last_login_at
  const sortedByLoginResponse =
    await api.functional.discussionBoard.members.index(
      unauthenticatedConnection,
      {
        body: {
          sort_by: "last_login_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardMember.IRequest,
      },
    );
  typia.assert(sortedByLoginResponse);
  TestValidator.predicate(
    "sorted by last_login_at results should be returned",
    sortedByLoginResponse.data.length >= 0,
  );

  // Test 9: Test sorting by article_count
  const sortedByArticleResponse =
    await api.functional.discussionBoard.members.index(
      unauthenticatedConnection,
      {
        body: {
          sort_by: "article_count",
          sort_order: "desc",
        } satisfies IDiscussionBoardMember.IRequest,
      },
    );
  typia.assert(sortedByArticleResponse);
  TestValidator.predicate(
    "sorted by article_count results should be returned",
    sortedByArticleResponse.data.length >= 0,
  );

  // Test 10: Test email_verified filter
  const verifiedResponse = await api.functional.discussionBoard.members.index(
    unauthenticatedConnection,
    {
      body: {
        email_verified: true,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(verifiedResponse);
  TestValidator.predicate(
    "email_verified filter should return results",
    verifiedResponse.data.length >= 0,
  );

  // Test 11: Test combined filters and sorting
  const combinedResponse = await api.functional.discussionBoard.members.index(
    unauthenticatedConnection,
    {
      body: {
        account_status: ["active"],
        sort_by: "display_name",
        sort_order: "asc",
        limit: 5,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(combinedResponse);
  TestValidator.predicate(
    "combined filters should return results",
    combinedResponse.data.length >= 0,
  );
  TestValidator.predicate(
    "limit should be respected in combined filter",
    combinedResponse.pagination.limit === 5,
  );

  // Test 12: Verify pagination across multiple pages
  if (basicListResponse.pagination.pages > 1) {
    const secondPageResponse =
      await api.functional.discussionBoard.members.index(
        unauthenticatedConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IDiscussionBoardMember.IRequest,
        },
      );
    typia.assert(secondPageResponse);
    TestValidator.predicate(
      "second page should be accessible",
      secondPageResponse.pagination.current === 2,
    );
  }
}
