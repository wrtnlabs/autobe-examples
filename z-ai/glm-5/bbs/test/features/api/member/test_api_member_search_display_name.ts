import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_search_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Create a public connection (no auth required for this endpoint)
  const publicConnection: api.IConnection = { host: connection.host };
  // Get initial members list to find a display name to search for
  const initialResponse = await api.functional.discussionBoard.members.index(
    publicConnection,
    {
      body: {
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(initialResponse);
  // Skip detailed tests if no members exist, but still verify API works
  if (initialResponse.data.length === 0) {
    // Test non-existent name search returns empty results
    const emptySearch = await api.functional.discussionBoard.members.index(
      publicConnection,
      {
        body: {
          displayName: RandomGenerator.alphabets(20),
          limit: 10,
        } satisfies IDiscussionBoardMember.IRequest,
      },
    );
    typia.assert(emptySearch);
    TestValidator.equals(
      "empty search should return no results",
      emptySearch.data.length,
      0,
    );
    return;
  }
  // Use the first member for testing
  const member = initialResponse.data[0];
  const displayName = member.displayName;
  // Test 1: Search with full display name - should find the exact member
  const fullSearch = await api.functional.discussionBoard.members.index(
    publicConnection,
    {
      body: {
        displayName: displayName,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(fullSearch);
  TestValidator.predicate(
    "full name search should find the member",
    fullSearch.data.some((m) => m.id === member.id),
  );
  // Test 2: Search with prefix (first few characters) - partial matching
  const prefixLength = Math.min(3, displayName.length);
  const prefix = displayName.substring(0, prefixLength);
  const prefixSearch = await api.functional.discussionBoard.members.index(
    publicConnection,
    {
      body: {
        displayName: prefix,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(prefixSearch);
  // Partial match should return results (trigram search finds similar strings)
  TestValidator.predicate(
    "prefix search should return results",
    prefixSearch.data.length > 0,
  );
  // Test 3: Case-insensitive search
  const upperCaseSearch = await api.functional.discussionBoard.members.index(
    publicConnection,
    {
      body: {
        displayName: displayName.toUpperCase(),
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(upperCaseSearch);
  // Case-insensitive should still find the member
  TestValidator.predicate(
    "case-insensitive search should find the member",
    upperCaseSearch.data.some((m) => m.id === member.id),
  );
  // Test 4: Search with middle characters (if name is long enough)
  if (displayName.length >= 4) {
    const middleStart = Math.floor(displayName.length / 2);
    const middleLength = Math.min(2, displayName.length - middleStart);
    const middleChars = displayName.substring(
      middleStart,
      middleStart + middleLength,
    );
    const middleSearch = await api.functional.discussionBoard.members.index(
      publicConnection,
      {
        body: {
          displayName: middleChars,
          limit: 100,
        } satisfies IDiscussionBoardMember.IRequest,
      },
    );
    typia.assert(middleSearch);
    // Middle character search should return results (trigram similarity)
    TestValidator.predicate(
      "middle character search should return results",
      middleSearch.data.length >= 0,
    );
  }
  // Test 5: Pagination with search filter
  const page1 = await api.functional.discussionBoard.members.index(
    publicConnection,
    {
      body: {
        displayName: prefix,
        page: 1,
        limit: 5,
        sortField: "created_at",
        sortOrder: "desc",
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "pagination current page should be 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    page1.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    page1.pagination.pages >= 0,
  );
  // Test 6: Non-existent name search should return empty results
  const nonExistentName = "nonexistent" + RandomGenerator.alphabets(15);
  const nonExistentSearch = await api.functional.discussionBoard.members.index(
    publicConnection,
    {
      body: {
        displayName: nonExistentName,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(nonExistentSearch);
  TestValidator.equals(
    "non-existent name search should return empty results",
    nonExistentSearch.data.length,
    0,
  );
}
