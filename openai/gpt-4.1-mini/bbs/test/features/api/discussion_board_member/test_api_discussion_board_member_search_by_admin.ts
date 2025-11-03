import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test that an admin can join the system and perform filtered, paginated
 * searches of discussion board members with valid authentication token. The
 * test includes:
 *
 * 1. Admin joins and obtains token.
 * 2. Admin performs search queries with different pagination and filters.
 * 3. Verifies that the search results match the criteria.
 * 4. Verifies that pagination metadata is consistent.
 */
export async function test_api_discussion_board_member_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@ssw0rd";

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);
  typia.assert(admin.email);

  // 2. Prepare search criteria samples
  // We will run multiple search tests for pagination, filtering, sorting.

  const searchTests: IDiscussionBoardMember.IRequest[] = [];

  // Example 1: Default pagination, no filter
  searchTests.push({} satisfies IDiscussionBoardMember.IRequest);

  // Example 2: Search by partial email substring (using a substring from existing data)
  const emailSubstr = admin.email.substring(0, 3);
  searchTests.push({
    search: emailSubstr,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardMember.IRequest);

  // Example 3: Search with pagination parameters
  searchTests.push({
    page: 2,
    limit: 5,
  } satisfies IDiscussionBoardMember.IRequest);

  // Example 4: Search with sorting options
  searchTests.push({
    sortBy: "email",
    sortOrder: "asc",
  } satisfies IDiscussionBoardMember.IRequest);

  // Example 5: Include deleted members flag true
  searchTests.push({
    includeDeleted: true,
  } satisfies IDiscussionBoardMember.IRequest);

  // 3. Run search queries, verify results
  for (const req of searchTests) {
    const response: IPageIDiscussionBoardMember.ISummary =
      await api.functional.discussionBoard.admin.discussionBoardMembers.index(
        connection,
        { body: req },
      );
    typia.assert(response);

    // Validate pagination metadata
    const pagination = response.pagination;
    TestValidator.predicate(
      `pagination current page >= 1`,
      pagination.current >= 1,
    );
    TestValidator.predicate(
      `pagination limit >= 1 and <= 100`,
      pagination.limit >= 1 && pagination.limit <= 100,
    );
    TestValidator.predicate(`pagination records >= 0`, pagination.records >= 0);
    TestValidator.predicate(`pagination pages >= 0`, pagination.pages >= 0);
    TestValidator.predicate(
      `pagination current page not exceed pages`,
      pagination.current <= pagination.pages || pagination.pages === 0,
    );

    // Validate all member summaries conform to.IDiscussionBoardMember.ISummary
    for (const member of response.data) {
      typia.assert(member);
      if (req.search !== null && req.search !== undefined) {
        // Search text should be included in email
        TestValidator.predicate(
          `email contains search string: ${req.search}`,
          member.email.includes(req.search),
        );
      }
    }
  }
}
