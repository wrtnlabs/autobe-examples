import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test member directory search as an authenticated member.
 *
 * This test validates that authenticated members can successfully search and
 * retrieve the member directory. The test creates several member accounts,
 * authenticates as one of them, and performs a search operation to verify the
 * search functionality works correctly for authenticated users.
 *
 * Note: The original scenario requested testing profile_visibility filtering
 * (public, members_only, private), but the IDiscussionBoardMember.ICreate DTO
 * does not support setting profile_visibility during creation. Therefore, this
 * test focuses on validating that authenticated member search functionality
 * works correctly.
 *
 * Steps:
 *
 * 1. Create several test member accounts
 * 2. Authenticate as a new member using join endpoint
 * 3. Perform member directory search as authenticated member
 * 4. Validate search results are returned successfully
 * 5. Verify created members appear in search results
 */
export async function test_api_member_search_members_only_visibility_as_authenticated_member(
  connection: api.IConnection,
) {
  // Create several test member accounts
  const createdMembers: IDiscussionBoardMember.ISummary[] =
    await ArrayUtil.asyncRepeat(5, async (index) => {
      const createData = {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        href: "https://example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IDiscussionBoardMember.ICreate;

      return await api.functional.discussionBoard.members.create(connection, {
        body: createData,
      });
    });

  // Validate created members
  for (const member of createdMembers) {
    typia.assert(member);
  }

  // Authenticate as a new member to establish authenticated context
  const authMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: "AuthPass123!",
        href: "https://example.com/login" satisfies string & tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(authMember);

  // Search the member directory as authenticated member
  const searchResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(searchResult);

  // Validate search results structure
  TestValidator.predicate(
    "search result should have pagination data",
    searchResult.pagination !== null && searchResult.pagination !== undefined,
  );

  TestValidator.predicate(
    "search result should have data array",
    Array.isArray(searchResult.data),
  );

  TestValidator.predicate(
    "search result should contain members",
    searchResult.data.length > 0,
  );

  // Verify that at least some of the created members appear in search results
  const createdMemberIds = createdMembers.map((m) => m.id);
  const foundCreatedMembers = searchResult.data.filter((m) =>
    createdMemberIds.includes(m.id),
  );

  TestValidator.predicate(
    "authenticated member search should return member records",
    foundCreatedMembers.length > 0,
  );
}
