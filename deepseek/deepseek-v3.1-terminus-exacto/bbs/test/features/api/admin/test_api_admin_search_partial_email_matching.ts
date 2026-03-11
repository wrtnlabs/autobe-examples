import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test partial email matching functionality in administrator search.
 * 1. Create authenticated administrator connection
 * 2. Create multiple administrator accounts with various email patterns
 * 3. Test search with domain matching (@example.com), partial username matching (admin),
 *    full prefix matching, and non-matching terms
 * 4. Validate case-insensitive behavior and pagination with filtered results
 * 5. Test combination with admin_grade and date range filters
 */
export async function test_api_admin_search_partial_email_matching(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated administrator connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create multiple administrator accounts with specific email patterns
  const adminEmails = [
    "regular.admin@example.com",
    "super.admin@example.com",
    "admin.user@gmail.com",
    "test.admin@example.org",
    "user.admin@example.com",
    "non.admin.user@different.com",
  ];
  // Create admin accounts for each email
  for (const email of adminEmails) {
    const tempConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(tempConnection, {
      body: {
        email: email satisfies string & tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
    typia.assert(admin);
  }
  // 3. Test 1: Search by domain '@example.com' (partial matching)
  const domainSearch = await api.functional.discussionBoard.admins.index(
    adminConnection,
    {
      body: {
        search: "@example.com",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(domainSearch);
  // Should find accounts with @example.com domain
  const domainMatches = adminEmails.filter((email) =>
    email.includes("@example.com"),
  );
  TestValidator.equals(
    "domain search returns correct number of matches",
    domainSearch.data.length,
    domainMatches.length,
  );
  // Verify all returned emails contain the search term
  for (const admin of domainSearch.data) {
    TestValidator.predicate(
      "email contains domain search term",
      admin.email.toLowerCase().includes("@example.com"),
    );
  }
  // 4. Test 2: Search by partial username 'admin'
  const adminSearch = await api.functional.discussionBoard.admins.index(
    adminConnection,
    {
      body: {
        search: "admin",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(adminSearch);
  // Should find accounts with 'admin' in email
  const adminMatches = adminEmails.filter((email) =>
    email.toLowerCase().includes("admin"),
  );
  TestValidator.equals(
    "admin search returns correct number of matches",
    adminSearch.data.length,
    adminMatches.length,
  );
  // Verify case-insensitive matching
  for (const admin of adminSearch.data) {
    TestValidator.predicate(
      "email contains admin (case-insensitive)",
      admin.email.toLowerCase().includes("admin"),
    );
  }
  // 5. Test 3: Search by full prefix 'regular.admin'
  const prefixSearch = await api.functional.discussionBoard.admins.index(
    adminConnection,
    {
      body: {
        search: "regular.admin",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(prefixSearch);
  // Should find exact match for 'regular.admin@example.com'
  const prefixMatches = adminEmails.filter((email) =>
    email.includes("regular.admin"),
  );
  TestValidator.equals(
    "prefix search returns correct number of matches",
    prefixSearch.data.length,
    prefixMatches.length,
  );
  // 6. Test 4: Search by non-matching term
  const noMatchSearch = await api.functional.discussionBoard.admins.index(
    adminConnection,
    {
      body: {
        search: "nonexistentterm12345",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "non-matching search returns empty results",
    noMatchSearch.data.length,
    0,
  );
  // 7. Test 5: Combination with admin_grade filter (regular administrators)
  const gradeSearch = await api.functional.discussionBoard.admins.index(
    adminConnection,
    {
      body: {
        search: "@example.com",
        admin_grade: "regular",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(gradeSearch);
  // At least one result should match both criteria
  TestValidator.predicate(
    "combination search returns results",
    gradeSearch.data.length > 0,
  );
  // 8. Test 6: Pagination with filtered results
  const paginatedSearch = await api.functional.discussionBoard.admins.index(
    adminConnection,
    {
      body: {
        search: "@example.com",
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination limit works",
    paginatedSearch.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination metadata is valid",
    paginatedSearch.pagination.limit === 2 &&
      paginatedSearch.pagination.current === 1,
  );
  // 9. Test 7: Case-insensitive search with uppercase
  const uppercaseSearch = await api.functional.discussionBoard.admins.index(
    adminConnection,
    {
      body: {
        search: "ADMIN",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(uppercaseSearch);
  // Should return same results as lowercase 'admin' search
  TestValidator.equals(
    "case-insensitive search returns same results",
    uppercaseSearch.data.length,
    adminSearch.data.length,
  );
  // 10. Test 8: Search with date range filter
  const now = new Date();
  const sevenDaysAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeSearch = await api.functional.discussionBoard.admins.index(
    adminConnection,
    {
      body: {
        search: "@example.com",
        created_at_start: sevenDaysAgo satisfies string &
          tags.Format<"date-time">,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(dateRangeSearch);
  TestValidator.predicate(
    "date range search returns results",
    dateRangeSearch.data.length > 0,
  );
}
