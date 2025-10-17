import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test member search pagination and sorting functionality.
 *
 * This test validates that the discussion board member search API properly
 * implements pagination with configurable page sizes and enforces maximum
 * limits. It creates a sufficient number of member accounts to test pagination
 * boundaries and verifies that pagination metadata is accurate.
 *
 * Test steps:
 *
 * 1. Create 35 member accounts to exceed default page size and enable multi-page
 *    testing
 * 2. Perform search with default pagination (no parameters specified)
 * 3. Verify default page size is 25 members
 * 4. Request custom page size of 10 and verify correct pagination
 * 5. Verify maximum page size limit of 100 is enforced
 * 6. Validate pagination metadata (total count, page number, page size, total
 *    pages)
 */
export async function test_api_member_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create 35 member accounts for pagination testing
  const memberCount = 35;
  const createdMembers: IDiscussionBoardMember.IAuthorized[] =
    await ArrayUtil.asyncRepeat(memberCount, async (index) => {
      const memberData = {
        username: `testuser${index}_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate;

      const member = await api.functional.auth.member.join(connection, {
        body: memberData,
      });
      typia.assert(member);

      return member;
    });

  // Verify all members were created
  TestValidator.equals(
    "created member count",
    createdMembers.length,
    memberCount,
  );

  // Step 2: Test default pagination (no parameters)
  const defaultPage = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(defaultPage);

  // Step 3: Verify default page size is 25 members
  TestValidator.predicate(
    "default page size should be 25 or less",
    defaultPage.data.length <= 25,
  );
  TestValidator.predicate(
    "pagination should have valid structure",
    defaultPage.pagination.current >= 0 &&
      defaultPage.pagination.limit > 0 &&
      defaultPage.pagination.records >= memberCount &&
      defaultPage.pagination.pages > 0,
  );

  // Step 4: Request custom page size of 10
  const customPageSize = 10;
  const customPage = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: customPageSize,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(customPage);

  // Verify custom page size
  TestValidator.predicate(
    "custom page size should be respected",
    customPage.data.length <= customPageSize,
  );
  TestValidator.equals(
    "page limit should match request",
    customPage.pagination.limit,
    customPageSize,
  );

  // Step 5: Test maximum page size limit (100)
  const maxLimitPage = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(maxLimitPage);

  TestValidator.predicate(
    "max page size should be enforced at 100",
    maxLimitPage.pagination.limit <= 100,
  );

  // Step 6: Validate pagination metadata accuracy
  TestValidator.predicate(
    "total records should include created members",
    defaultPage.pagination.records >= memberCount,
  );

  TestValidator.predicate(
    "total pages calculation should be correct",
    defaultPage.pagination.pages ===
      Math.ceil(defaultPage.pagination.records / defaultPage.pagination.limit),
  );

  // Test page 2 to verify multi-page pagination
  if (defaultPage.pagination.pages > 1) {
    const page2 = await api.functional.discussionBoard.users.index(connection, {
      body: {
        page: 2,
        limit: 25,
      } satisfies IDiscussionBoardMember.IRequest,
    });
    typia.assert(page2);

    TestValidator.equals(
      "page number should be 2",
      page2.pagination.current,
      2,
    );
    TestValidator.predicate(
      "page 2 should have valid data",
      page2.data.length > 0 && page2.data.length <= 25,
    );
  }
}
