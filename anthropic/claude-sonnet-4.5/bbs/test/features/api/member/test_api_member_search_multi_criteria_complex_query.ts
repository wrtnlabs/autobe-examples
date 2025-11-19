import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test member search with multiple filter criteria including text search,
 * pagination, and ordering.
 *
 * This test validates the member search API's ability to handle complex queries
 * by combining text search filters with ordering and pagination parameters. It
 * creates a diverse member dataset with varied usernames and performs searches
 * to validate that filtering, ordering, and pagination work correctly
 * together.
 *
 * Note: This test focuses on validating observable behavior from the ISummary
 * response (username, display_name). Advanced filters like emailVerified and
 * isSuspended are included in the request to test API acceptance but cannot be
 * validated from the response since ISummary doesn't expose these fields.
 *
 * Test Steps:
 *
 * 1. Create and authenticate moderator account
 * 2. Create 25 test members with varied username patterns
 * 3. Create some members with verification and suspension states
 * 4. Execute complex search combining text query, filters, ordering, and
 *    pagination
 * 5. Validate text search matches username patterns
 * 6. Verify ordering is applied correctly
 * 7. Validate pagination metadata
 */
export async function test_api_member_search_multi_criteria_complex_query(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create diverse member dataset with varied username patterns
  const memberIds: string[] = [];

  // Create 10 members with "john" in username for search testing
  const johnMembers = await ArrayUtil.asyncRepeat(10, async (index) => {
    const username = `john_user_${index}_${RandomGenerator.alphabets(3)}`;
    const memberEmail = typia.random<string & tags.Format<"email">>();

    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "password123",
        username: username,
        display_name: index % 2 === 0 ? RandomGenerator.name(2) : null,
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    memberIds.push(member.id);

    return member;
  });

  // Create 15 members without "john" in username for contrast
  const otherMembers = await ArrayUtil.asyncRepeat(15, async (index) => {
    const username = `member_${RandomGenerator.alphabets(8)}_${index}`;
    const memberEmail = typia.random<string & tags.Format<"email">>();

    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "password123",
        username: username,
        display_name: RandomGenerator.name(2),
        bio:
          index % 3 === 0 ? RandomGenerator.paragraph({ sentences: 1 }) : null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    memberIds.push(member.id);

    return member;
  });

  // Step 3: Create some suspensions for testing filter acceptance
  const suspensionCount = Math.min(5, memberIds.length);
  for (let i = 0; i < suspensionCount; i++) {
    const memberId = memberIds[i];

    const suspension =
      await api.functional.discussionBoard.moderator.accountActions.create(
        connection,
        {
          body: {
            discussion_board_member_id: memberId,
            action_type: "suspension",
            reason: "Test suspension for complex query validation",
            duration_days: 7,
          } satisfies IDiscussionBoardAccountAction.ICreate,
        },
      );
    typia.assert(suspension);
  }

  // Step 4: Execute complex search with multiple combined filters
  const searchText = "john";
  const currentTime = new Date();
  const thirtyDaysAgo = new Date(
    currentTime.getTime() - 30 * 24 * 60 * 60 * 1000,
  );

  const searchResults =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: searchText,
        emailVerified: false,
        isSuspended: false,
        createdAfter: thirtyDaysAgo.toISOString(),
        createdBefore: currentTime.toISOString(),
        orderBy: "username",
        orderDirection: "asc",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(searchResults);

  // Step 5: Validate text search matches username patterns
  TestValidator.predicate(
    "search results should contain members",
    searchResults.data.length > 0,
  );

  for (const result of searchResults.data) {
    TestValidator.predicate(
      `username "${result.username}" should contain search text "${searchText}"`,
      result.username.toLowerCase().includes(searchText.toLowerCase()),
    );
  }

  // Step 6: Verify ordering is applied correctly (ascending by username)
  if (searchResults.data.length > 1) {
    for (let i = 0; i < searchResults.data.length - 1; i++) {
      const currentUsername = searchResults.data[i].username;
      const nextUsername = searchResults.data[i + 1].username;

      TestValidator.predicate(
        `username ordering: "${currentUsername}" should be <= "${nextUsername}"`,
        currentUsername.localeCompare(nextUsername) <= 0,
      );
    }
  }

  // Step 7: Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResults.pagination.current,
    1,
  );

  TestValidator.equals("pagination limit", searchResults.pagination.limit, 20);

  TestValidator.predicate(
    "pagination records should be at least the data length",
    searchResults.pagination.records >= searchResults.data.length,
  );

  TestValidator.equals(
    "pagination pages calculation",
    searchResults.pagination.pages,
    Math.ceil(
      searchResults.pagination.records / searchResults.pagination.limit,
    ),
  );

  // Additional validation: Test pagination with page 2 if enough results
  if (searchResults.pagination.pages > 1) {
    const page2Results =
      await api.functional.discussionBoard.moderator.members.index(connection, {
        body: {
          page: 2,
          limit: 20,
          search: searchText,
          orderBy: "username",
          orderDirection: "asc",
        } satisfies IDiscussionBoardMember.IRequest,
      });
    typia.assert(page2Results);

    TestValidator.equals(
      "second page current page",
      page2Results.pagination.current,
      2,
    );

    // Validate no overlap between page 1 and page 2
    if (searchResults.data.length > 0 && page2Results.data.length > 0) {
      const page1Usernames = searchResults.data.map((m) => m.username);
      const page2Usernames = page2Results.data.map((m) => m.username);

      const hasOverlap = page1Usernames.some((username) =>
        page2Usernames.includes(username),
      );

      TestValidator.predicate(
        "page 1 and page 2 should have no overlapping members",
        !hasOverlap,
      );
    }
  }
}
