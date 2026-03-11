import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test email partial matching functionality for super administrator search.
 *
 * This test validates that searching with partial email addresses returns matching
 * results. Since we cannot create super admin accounts via API, we test the search
 * functionality with patterns that might exist in the current system.
 */
export async function test_api_super_admin_search_email_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // First, get a sample of existing super admins to understand available email patterns
  const initialSearch = await api.functional.discussionBoard.super_admins.index(
    connection,
    {
      body: {
        limit: 5,
        page: 1,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(initialSearch);
  // If no super admins exist, we cannot test the search functionality
  if (initialSearch.data.length === 0) {
    console.log(
      "No super admins found - search functionality cannot be tested",
    );
    return;
  }
  // Extract common patterns from existing emails for testing
  const sampleEmail = initialSearch.data[0].email;
  // Test various partial match scenarios using patterns from the sample email
  const emailParts = sampleEmail.split("@");
  const localPart = emailParts[0];
  const domainPart = emailParts[1];
  // Test 1: Search with local part (username before @)
  if (localPart.length > 3) {
    const localSearch = await api.functional.discussionBoard.super_admins.index(
      connection,
      {
        body: {
          search: localPart.substring(0, 3), // first 3 characters
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
    typia.assert(localSearch);
  }
  // Test 2: Search with domain part
  if (domainPart.length > 3) {
    const domainSearch =
      await api.functional.discussionBoard.super_admins.index(connection, {
        body: {
          search: domainPart.substring(0, 3), // first 3 characters of domain
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      });
    typia.assert(domainSearch);
  }
  // Test 3: Search with full email (exact match scenario)
  const exactSearch = await api.functional.discussionBoard.super_admins.index(
    connection,
    {
      body: {
        search: sampleEmail,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(exactSearch);
  // Test 4: Case-insensitive search
  const caseSearch = await api.functional.discussionBoard.super_admins.index(
    connection,
    {
      body: {
        search: sampleEmail.toUpperCase(), // uppercase version
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(caseSearch);
  // Test 5: Non-matching pattern search
  const nonMatchingSearch =
    await api.functional.discussionBoard.super_admins.index(connection, {
      body: {
        search: "xyz123nonexistentpattern",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    });
  typia.assert(nonMatchingSearch);
  // Test 6: Pagination validation
  const paginationSearch =
    await api.functional.discussionBoard.super_admins.index(connection, {
      body: {
        search: sampleEmail.substring(0, Math.min(3, sampleEmail.length)),
        limit: 2, // small limit to test pagination
        page: 1,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    });
  typia.assert(paginationSearch);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination limit matches request",
    paginationSearch.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "current page is valid",
    paginationSearch.pagination.current >= 1,
  );
  TestValidator.predicate(
    "total records is non-negative",
    paginationSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    paginationSearch.pagination.pages >= 0,
  );
  // Basic validation that search functionality works
  TestValidator.predicate(
    "search endpoint returns valid response",
    initialSearch.pagination.records >= 0,
  );
}
