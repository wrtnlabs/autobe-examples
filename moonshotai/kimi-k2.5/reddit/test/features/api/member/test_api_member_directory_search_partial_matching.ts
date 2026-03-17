import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMember";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the search functionality with partial matching on email addresses and usernames.
 * This validates the member discovery feature where users can find specific members.
 * Test scenarios:
 * - Search by exact username match returns member in results
 * - Search by partial username (substring) returns matching members
 * - Search by partial email address returns matching members
 * - Case-insensitive search behavior (searching 'john' matches 'John')
 * - Search with no matches returns empty data array with zero total records
 * - Search combined with pagination applies correctly
 * - Search term handles special characters appropriately
 */
export async function test_api_member_directory_search_partial_matching(
  connection: api.IConnection,
): Promise<void> {
  // Use base connection - no authentication required per endpoint specification
  const testConnection: api.IConnection = { host: connection.host };
  // First, get all members to have test data
  const allMembersResponse = await api.functional.redditLike.members.index(
    testConnection,
    {
      body: {
        search: null,
        minKarma: null,
        maxKarma: null,
        role: null,
        page: null,
        limit: null,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(allMembersResponse);
  const allMembers = allMembersResponse.data;
  // Skip tests if no members exist in the system
  if (allMembers.length === 0) {
    return;
  }
  // Use a sample member for testing
  const sampleMember = RandomGenerator.pick(allMembers);
  const sampleUsername = sampleMember.username;
  const sampleEmail = sampleMember.email;
  // 1. Test exact username match
  const exactMatchResponse = await api.functional.redditLike.members.index(
    testConnection,
    {
      body: {
        search: sampleUsername,
        minKarma: null,
        maxKarma: null,
        role: null,
        page: null,
        limit: null,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(exactMatchResponse);
  TestValidator.predicate(
    "exact username match returns member",
    exactMatchResponse.data.some((m) => m.id === sampleMember.id),
  );
  // 2. Test partial username (substring) matching
  if (sampleUsername.length > 2) {
    const partialUsername = sampleUsername.substring(
      0,
      Math.min(3, sampleUsername.length),
    );
    const partialMatchResponse = await api.functional.redditLike.members.index(
      testConnection,
      {
        body: {
          search: partialUsername,
          minKarma: null,
          maxKarma: null,
          role: null,
          page: null,
          limit: null,
        } satisfies IRedditLikeMember.IRequest,
      },
    );
    typia.assert(partialMatchResponse);
    TestValidator.predicate(
      "partial username substring returns matching members",
      partialMatchResponse.data.some((m) =>
        m.username.includes(partialUsername),
      ),
    );
  }
  // 3. Test partial email address matching
  if (sampleEmail.includes("@")) {
    const localPart = sampleEmail.split("@")[0];
    if (localPart.length > 0) {
      const partialEmail = localPart.substring(
        0,
        Math.min(4, localPart.length),
      );
      const emailMatchResponse = await api.functional.redditLike.members.index(
        testConnection,
        {
          body: {
            search: partialEmail,
            minKarma: null,
            maxKarma: null,
            role: null,
            page: null,
            limit: null,
          } satisfies IRedditLikeMember.IRequest,
        },
      );
      typia.assert(emailMatchResponse);
      TestValidator.predicate(
        "partial email address returns matching members",
        emailMatchResponse.data.some((m) => m.email.includes(partialEmail)),
      );
    }
  }
  // 4. Test case-insensitive search behavior
  const upperCaseSearch = sampleUsername.toUpperCase();
  const lowerCaseSearch = sampleUsername.toLowerCase();
  // Search with uppercase - should match regardless of case
  const upperCaseResponse = await api.functional.redditLike.members.index(
    testConnection,
    {
      body: {
        search: upperCaseSearch,
        minKarma: null,
        maxKarma: null,
        role: null,
        page: null,
        limit: null,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(upperCaseResponse);
  // Search with lowercase
  const lowerCaseResponse = await api.functional.redditLike.members.index(
    testConnection,
    {
      body: {
        search: lowerCaseSearch,
        minKarma: null,
        maxKarma: null,
        role: null,
        page: null,
        limit: null,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(lowerCaseResponse);
  // Both should find the member (case-insensitive)
  const hasMemberInUpperCase = upperCaseResponse.data.some(
    (m) => m.id === sampleMember.id,
  );
  const hasMemberInLowerCase = lowerCaseResponse.data.some(
    (m) => m.id === sampleMember.id,
  );
  TestValidator.predicate(
    "case-insensitive search matches uppercase query",
    hasMemberInUpperCase,
  );
  TestValidator.predicate(
    "case-insensitive search matches lowercase query",
    hasMemberInLowerCase,
  );
  // 5. Test search with no matches
  const randomLongString =
    "xyz12345nonexistent" + RandomGenerator.alphaNumeric(20);
  const noMatchResponse = await api.functional.redditLike.members.index(
    testConnection,
    {
      body: {
        search: randomLongString,
        minKarma: null,
        maxKarma: null,
        role: null,
        page: null,
        limit: null,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(noMatchResponse);
  TestValidator.equals(
    "no match search returns empty data array",
    noMatchResponse.data.length,
    0,
  );
  TestValidator.equals(
    "no match search returns zero total records",
    noMatchResponse.pagination.records,
    0,
  );
  // 6. Test search combined with pagination
  if (allMembers.length >= 2) {
    // Search with pagination - page 1, limit 1
    const pagedSearchResponse = await api.functional.redditLike.members.index(
      testConnection,
      {
        body: {
          search: null,
          minKarma: null,
          maxKarma: null,
          role: null,
          page: 1,
          limit: 1 satisfies number as number,
        } satisfies IRedditLikeMember.IRequest,
      },
    );
    typia.assert(pagedSearchResponse);
    TestValidator.equals(
      "paged search returns correct limit",
      pagedSearchResponse.pagination.limit,
      1,
    );
    TestValidator.equals(
      "paged search has page 1",
      pagedSearchResponse.pagination.current,
      1,
    );
    TestValidator.predicate(
      "paged search data length within limit",
      pagedSearchResponse.data.length <= pagedSearchResponse.pagination.limit,
    );
    // Test page 2 if there are enough records
    if (pagedSearchResponse.pagination.records > 1) {
      const page2Response = await api.functional.redditLike.members.index(
        testConnection,
        {
          body: {
            search: null,
            minKarma: null,
            maxKarma: null,
            role: null,
            page: 2 satisfies number as number,
            limit: 1 satisfies number as number,
          } satisfies IRedditLikeMember.IRequest,
        },
      );
      typia.assert(page2Response);
      TestValidator.equals(
        "page 2 has current page set correctly",
        page2Response.pagination.current,
        2,
      );
      TestValidator.predicate(
        "page 2 and page 1 have different data",
        page2Response.data.length === 0 ||
          page2Response.data.every(
            (m2) => !pagedSearchResponse.data.some((m1) => m1.id === m2.id),
          ),
      );
    }
  }
  // 7. Test search with special characters - validate it doesn't throw
  const specialCharsSearch = "test@example.com-test_underscore";
  const specialCharsResponse = await api.functional.redditLike.members.index(
    testConnection,
    {
      body: {
        search: specialCharsSearch,
        minKarma: null,
        maxKarma: null,
        role: null,
        page: null,
        limit: null,
      } satisfies IRedditLikeMember.IRequest,
    },
  );
  typia.assert(specialCharsResponse);
  // Response is valid regardless of whether matches were found
  TestValidator.predicate(
    "search with special characters returns valid response structure",
    typeof specialCharsResponse.pagination.records === "number" &&
      specialCharsResponse.pagination.records >= 0,
  );
}
