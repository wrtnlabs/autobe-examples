import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test member search with keyword matching across username, display_name, and
 * bio fields.
 *
 * This test validates the comprehensive search functionality that uses
 * trigram-based similarity matching to find members across multiple profile
 * fields. The test creates members with distinctive profile information and
 * performs keyword searches to verify that the search correctly identifies
 * matching members.
 *
 * Test workflow:
 *
 * 1. Create multiple members with distinctive usernames, display names, and bio
 *    content
 * 2. Perform keyword searches targeting different fields (username, display_name,
 *    bio)
 * 3. Validate that search results include all matching members
 * 4. Verify pagination structure and response format
 * 5. Ensure non-matching members are excluded from keyword-specific results
 */
export async function test_api_member_search_with_keyword_filtering(
  connection: api.IConnection,
) {
  // Create members with distinctive keywords in different fields
  const uniqueKeyword1 = RandomGenerator.alphaNumeric(8);
  const uniqueKeyword2 = RandomGenerator.alphaNumeric(8);
  const uniqueKeyword3 = RandomGenerator.alphaNumeric(8);

  // Member 1: Keyword in username
  const member1 = await api.functional.discussionBoard.members.create(
    connection,
    {
      body: {
        username: `user_${uniqueKeyword1}_test`,
        email: `${RandomGenerator.alphaNumeric(12)}@example.com`,
        password: `Pass123!${RandomGenerator.alphaNumeric(4)}`,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 5 }),
        href: `https://example.com/register/${RandomGenerator.alphaNumeric(8)}`,
        referrer: `https://example.com/home/${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member1);

  // Member 2: Keyword in display_name
  const member2 = await api.functional.discussionBoard.members.create(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: `${RandomGenerator.alphaNumeric(12)}@example.com`,
        password: `Pass123!${RandomGenerator.alphaNumeric(4)}`,
        display_name: `Display ${uniqueKeyword2} Name`,
        bio: RandomGenerator.paragraph({ sentences: 5 }),
        href: `https://example.com/register/${RandomGenerator.alphaNumeric(8)}`,
        referrer: `https://example.com/home/${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member2);

  // Member 3: Keyword in bio
  const member3 = await api.functional.discussionBoard.members.create(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: `${RandomGenerator.alphaNumeric(12)}@example.com`,
        password: `Pass123!${RandomGenerator.alphaNumeric(4)}`,
        display_name: RandomGenerator.name(),
        bio: `This is a biography containing the keyword ${uniqueKeyword3} for testing purposes`,
        href: `https://example.com/register/${RandomGenerator.alphaNumeric(8)}`,
        referrer: `https://example.com/home/${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member3);

  // Member 4: Control member without any unique keywords
  const member4 = await api.functional.discussionBoard.members.create(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: `${RandomGenerator.alphaNumeric(12)}@example.com`,
        password: `Pass123!${RandomGenerator.alphaNumeric(4)}`,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 5 }),
        href: `https://example.com/register/${RandomGenerator.alphaNumeric(8)}`,
        referrer: `https://example.com/home/${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member4);

  // Test 1: Search by keyword in username
  const searchResult1 = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: uniqueKeyword1,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(searchResult1);

  TestValidator.predicate(
    "search by username keyword should find member1",
    searchResult1.data.some((m) => m.id === member1.id),
  );

  TestValidator.predicate(
    "search by username keyword should not include control member",
    !searchResult1.data.some((m) => m.id === member4.id),
  );

  // Test 2: Search by keyword in display_name
  const searchResult2 = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: uniqueKeyword2,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(searchResult2);

  TestValidator.predicate(
    "search by display_name keyword should find member2",
    searchResult2.data.some((m) => m.id === member2.id),
  );

  TestValidator.predicate(
    "search by display_name keyword should not include control member",
    !searchResult2.data.some((m) => m.id === member4.id),
  );

  // Test 3: Search by keyword in bio
  const searchResult3 = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        search: uniqueKeyword3,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(searchResult3);

  TestValidator.predicate(
    "search by bio keyword should find member3",
    searchResult3.data.some((m) => m.id === member3.id),
  );

  TestValidator.predicate(
    "search by bio keyword should not include control member",
    !searchResult3.data.some((m) => m.id === member4.id),
  );

  // Test 4: Verify pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    searchResult1.pagination.current >= 0 &&
      searchResult1.pagination.limit > 0 &&
      searchResult1.pagination.records >= 0 &&
      searchResult1.pagination.pages >= 0,
  );
}
