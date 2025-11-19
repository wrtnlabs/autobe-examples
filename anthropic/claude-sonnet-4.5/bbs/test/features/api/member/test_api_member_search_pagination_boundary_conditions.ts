import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test member search pagination with boundary conditions and edge cases.
 *
 * This test validates that the member search pagination API handles edge cases
 * correctly:
 *
 * 1. Moderator authenticates to gain search access
 * 2. Creates exactly 25 members for controlled testing
 * 3. Tests various boundary scenarios:
 *
 *    - Requesting pages beyond total available pages
 *    - Requesting limits exceeding total record count
 *    - Testing maximum limit (100) and minimum limit (1)
 *    - Verifying last page with partial results
 * 4. Validates pagination metadata accuracy (current, limit, records, pages)
 * 5. Ensures empty results for out-of-range pages don't cause errors
 * 6. Verifies limit parameter is capped at maximum 100 and minimum 1
 */
export async function test_api_member_search_pagination_boundary_conditions(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorPassword = "moderatorPassword123";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: moderatorPassword,
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Store moderator token for restoration
  const moderatorToken = moderator.token.access;

  // Step 2: Create exactly 25 members for controlled pagination testing
  const memberCount = 25;
  const members = await ArrayUtil.asyncRepeat(memberCount, async (index) => {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email:
          `test_member_${index}_${typia.random<string & tags.Format<"uuid">>()}@example.com` satisfies string &
            tags.Format<"email">,
        password: "testPassword123",
        username: `testuser${index}${typia.random<number & tags.Type<"uint32"> & tags.Maximum<999999>>()}`,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // Restore moderator authentication by setting the token back
  connection.headers = connection.headers ?? {};
  connection.headers.Authorization = moderatorToken;

  // Step 3: Test boundary condition - Page beyond total pages
  const beyondPageResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 100,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond page returns empty data",
    beyondPageResult.data,
    [],
  );
  TestValidator.predicate(
    "beyond page has correct total records",
    beyondPageResult.pagination.records >= memberCount,
  );
  TestValidator.equals(
    "beyond page current matches request",
    beyondPageResult.pagination.current,
    100,
  );
  TestValidator.equals(
    "beyond page limit matches request",
    beyondPageResult.pagination.limit,
    10,
  );

  // Step 4: Test boundary condition - Limit exceeding total records
  const exceedLimitResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 1000,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(exceedLimitResult);
  TestValidator.predicate(
    "exceed limit returns all available members",
    exceedLimitResult.data.length >= memberCount,
  );
  TestValidator.equals(
    "exceed limit current page is 1",
    exceedLimitResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "exceed limit is capped at 100",
    exceedLimitResult.pagination.limit === 100,
  );

  // Step 5: Test maximum limit boundary (100)
  const maxLimitResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit is accepted",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit records count is correct",
    maxLimitResult.pagination.records >= memberCount,
  );
  TestValidator.equals(
    "max limit pages calculation",
    maxLimitResult.pagination.pages,
    Math.ceil(maxLimitResult.pagination.records / 100),
  );

  // Step 6: Test minimum limit boundary (1)
  const minLimitResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(minLimitResult);
  TestValidator.equals(
    "min limit is accepted",
    minLimitResult.pagination.limit,
    1,
  );
  TestValidator.equals(
    "min limit returns 1 item",
    minLimitResult.data.length,
    1,
  );
  TestValidator.predicate(
    "min limit total records is correct",
    minLimitResult.pagination.records >= memberCount,
  );
  TestValidator.equals(
    "min limit pages calculation",
    minLimitResult.pagination.pages,
    Math.ceil(minLimitResult.pagination.records / 1),
  );

  // Step 7: Test last page with partial results
  const limit = 10;
  const totalPages = Math.ceil(memberCount / limit);
  const lastPageResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: totalPages,
        limit: limit,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(lastPageResult);
  TestValidator.equals(
    "last page current matches request",
    lastPageResult.pagination.current,
    totalPages,
  );
  TestValidator.equals(
    "last page limit matches request",
    lastPageResult.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "last page has correct number of items",
    lastPageResult.data.length <= limit,
  );

  // Step 8: Verify pagination metadata accuracy with standard pagination
  const standardResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(standardResult);
  TestValidator.equals(
    "standard pagination current page",
    standardResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "standard pagination limit",
    standardResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "standard pagination records count",
    standardResult.pagination.records >= memberCount,
  );
  TestValidator.equals(
    "standard pagination pages calculation",
    standardResult.pagination.pages,
    Math.ceil(standardResult.pagination.records / 10),
  );
  TestValidator.predicate(
    "standard pagination data length",
    standardResult.data.length <= 10,
  );
}
