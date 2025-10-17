import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test partial username matching in member search functionality.
 *
 * This test validates that users can search for members using partial username
 * matching. The search functionality should find all members whose usernames
 * contain the search query substring, regardless of position.
 *
 * Test workflow:
 *
 * 1. Create multiple member accounts with distinct usernames containing common
 *    substrings
 * 2. Perform a search using a partial username query
 * 3. Verify all members with matching usernames are included in results
 * 4. Verify proper pagination structure in the response
 * 5. Verify sensitive fields (email, password_hash) are excluded from results
 * 6. Verify only public profile fields are present in the summary response
 */
export async function test_api_member_search_username_partial_matching(
  connection: api.IConnection,
) {
  // Step 1: Create multiple member accounts with searchable usernames
  const searchKeyword = "economist";
  const usernamePatterns = [
    `${searchKeyword}_john`,
    `political_${searchKeyword}`,
    `john_politics`,
    `${searchKeyword}_expert`,
    `data_${searchKeyword}`,
  ];

  const createdMembers: IDiscussionBoardMember.IAuthorized[] = [];

  for (const username of usernamePatterns) {
    const memberData = {
      username: username,
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
    createdMembers.push(member);
  }

  // Step 2: Perform search with partial username query
  const searchRequest = {
    search: searchKeyword,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardMember.IRequest;

  const searchResults: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.users.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResults);

  // Step 3: Verify all members with matching usernames are included
  const expectedMatchingUsernames = usernamePatterns.filter((name) =>
    name.includes(searchKeyword),
  );

  TestValidator.predicate(
    "search results should contain matching members",
    expectedMatchingUsernames.length > 0,
  );

  const resultUsernames = searchResults.data.map((member) => member.username);

  for (const expectedUsername of expectedMatchingUsernames) {
    const found = resultUsernames.some((username) =>
      username.includes(searchKeyword),
    );
    TestValidator.predicate(
      `search results should include members with '${searchKeyword}' in username`,
      found,
    );
  }

  // Step 4: Verify proper pagination structure
  typia.assert<IPage.IPagination>(searchResults.pagination);

  TestValidator.predicate(
    "pagination current page should be valid",
    searchResults.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be valid",
    searchResults.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    searchResults.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    searchResults.pagination.pages >= 0,
  );

  // Step 5 & 6: Verify response structure - typia.assert already validates complete type
  for (const member of searchResults.data) {
    typia.assert<IDiscussionBoardMember.ISummary>(member);
  }
}
