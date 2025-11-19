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
 * Test member search with text query matching usernames using case-insensitive
 * partial matching.
 *
 * This test validates that the member search API correctly performs
 * case-insensitive partial matching on usernames. The test creates multiple
 * members with usernames containing the substring 'john' and verifies that
 * searching with 'john' returns all matching members.
 *
 * Test flow:
 *
 * 1. Moderator authenticates to gain search privileges
 * 2. Create multiple members with usernames containing 'john' in various positions
 * 3. Create members without 'john' to ensure they are excluded
 * 4. Perform search with text query 'john'
 * 5. Verify all matching members are returned
 * 6. Verify non-matching members are excluded
 * 7. Verify case-insensitive matching with uppercase search
 */
export async function test_api_member_search_text_query_username_match(
  connection: api.IConnection,
) {
  // 1. Moderator authenticates
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "moderator123!",
      username: "test_moderator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create members with usernames containing 'john' in various positions
  const matchingUsernames = [
    "john_doe",
    "johnsmith",
    "alice_johnson",
    "JOHN_test",
    "John_Admin",
  ];
  const matchingMembers: IDiscussionBoardMember.IAuthorized[] = [];

  for (const username of matchingUsernames) {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123!",
        username: username,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    matchingMembers.push(member);
  }

  // 3. Create members without 'john' to ensure they are excluded from results
  const nonMatchingUsernames = ["alice_smith", "bob_williams", "charlie_brown"];
  const nonMatchingMembers: IDiscussionBoardMember.IAuthorized[] = [];

  for (const username of nonMatchingUsernames) {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123!",
        username: username,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    nonMatchingMembers.push(member);
  }

  // 4. Perform search with text query 'john' (lowercase)
  const searchResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        search: "john",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(searchResult);

  // 5. Verify all matching members are returned
  const resultMemberIds = searchResult.data.map((m) => m.id);

  for (const matchingMember of matchingMembers) {
    TestValidator.predicate(
      `matching member ${matchingMember.username} should be in search results`,
      resultMemberIds.includes(matchingMember.id),
    );
  }

  // 6. Verify non-matching members are excluded
  for (const nonMatchingMember of nonMatchingMembers) {
    TestValidator.predicate(
      `non-matching member ${nonMatchingMember.username} should NOT be in search results`,
      !resultMemberIds.includes(nonMatchingMember.id),
    );
  }

  // 7. Verify the search is case-insensitive by searching with uppercase
  const uppercaseSearchResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        search: "JOHN",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(uppercaseSearchResult);

  const uppercaseResultIds = uppercaseSearchResult.data.map((m) => m.id);

  // Verify same results are returned regardless of case
  for (const matchingMember of matchingMembers) {
    TestValidator.predicate(
      `case-insensitive: member ${matchingMember.username} should be found with uppercase search`,
      uppercaseResultIds.includes(matchingMember.id),
    );
  }
}
