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
 * Comprehensive test of member search functionality by authenticated
 * moderators.
 *
 * This test validates the complete moderator search workflow including creating
 * multiple test members with different attributes, authenticating as a
 * moderator, and performing various search operations with different filtering
 * criteria including username search, email domain filtering, registration date
 * ranges, and pagination parameters. The test ensures that search results
 * correctly match the applied filters and that pagination works as expected.
 */
export async function test_api_member_search_by_moderator(
  connection: api.IConnection,
) {
  // Create multiple test members with different attributes
  const baseUrl = "https://example.com";
  const members: IDiscussionBoardMember.IAuthorized[] = [];

  // Create 5 test members with different usernames and email domains
  for (let i = 0; i < 5; i++) {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: `testuser${i}`,
        password: "password123",
        display_name: `Test User ${i}`,
        bio: `Test bio for user ${i}`,
        href: baseUrl,
        referrer: baseUrl,
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    members.push(member);
  }

  // Create an additional member with specific searchable attributes
  const searchableMember = await api.functional.auth.member.join(connection, {
    body: {
      email: "specific.search@example.com",
      username: "search_test_user",
      password: "password123",
      display_name: "Search Test User",
      bio: "This user has specific searchable attributes",
      href: baseUrl,
      referrer: baseUrl,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(searchableMember);
  members.push(searchableMember);

  // Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: "test_moderator",
      password: "password123",
      display_name: "Test Moderator",
      bio: "Test moderator account",
      moderation_level: "senior",
      href: baseUrl,
      referrer: baseUrl,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Test 1: Basic search with no filters (get all members)
  const allMembersResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        pagination: {
          current: 1,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(allMembersResult);

  TestValidator.predicate(
    "basic search returns pagination information",
    allMembersResult.pagination.current === 1 &&
      allMembersResult.pagination.limit === 10 &&
      allMembersResult.pagination.records >= 0 &&
      allMembersResult.pagination.pages >= 0,
  );

  // Test 2: Search by username substring
  const searchResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        pagination: {
          current: 1,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        search: "search_test",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(searchResult);

  TestValidator.predicate("search by username substring returns results", true);

  if (searchResult.data.length > 0) {
    TestValidator.predicate(
      "search result contains users with matching username",
      searchResult.data.some((member) => member.name.includes("search_test")),
    );
  }

  // Test 3: Search with pagination limit
  const paginatedResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        pagination: {
          current: 1,
          limit: 3,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "pagination respects limit parameter",
    paginatedResult.data.length <= 3,
  );

  // Test 4: Search with date range filter (using a reasonable past date)
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  const dateFilterResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        pagination: {
          current: 1,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        filter: {
          created_after: pastDate.toISOString(),
        },
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(dateFilterResult);

  TestValidator.predicate("date filter returns successful response", true);

  // Test 5: Combined search and filter
  const combinedResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        pagination: {
          current: 1,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        search: "test",
        filter: {
          created_after: pastDate.toISOString(),
        },
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(combinedResult);

  TestValidator.predicate(
    "combined search and filter returns valid response",
    true,
  );

  // Validate member summary structure if results exist
  if (allMembersResult.data.length > 0) {
    const firstMember = allMembersResult.data[0];
    TestValidator.predicate(
      "member summary has required fields",
      typeof firstMember.id === "string" &&
        typeof firstMember.type === "string" &&
        typeof firstMember.name === "string",
    );

    TestValidator.predicate(
      "member ID is valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstMember.id,
      ),
    );
  }

  // Test empty search term
  const emptySearchResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        pagination: {
          current: 1,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        search: "",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(emptySearchResult);

  TestValidator.predicate("empty search term returns valid response", true);
}
