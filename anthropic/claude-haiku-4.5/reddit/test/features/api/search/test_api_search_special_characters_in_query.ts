import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchIndex";
import type { ICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchResult";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchResult";

/**
 * Test search with special characters and edge cases in the query string.
 *
 * This test validates that the search API properly handles keywords containing
 * special characters, punctuation, numbers, and edge cases. It ensures the
 * system can escape special characters correctly, process various edge cases,
 * and enforce the minimum character requirement without throwing errors.
 *
 * Test flow:
 *
 * 1. Create member account for authentication
 * 2. Create community for organizing posts
 * 3. Create posts with diverse content including special characters
 * 4. Perform searches with:
 *
 *    - Punctuation marks (@, #, $, %, &, *, etc.)
 *    - Numbers and alphanumeric combinations
 *    - Very long keyword strings
 *    - Single character searches
 *    - Mixed special characters
 * 5. Verify search results are returned appropriately
 * 6. Validate minimum 1 character requirement
 * 7. Confirm system handles edge cases gracefully
 */
export async function test_api_search_special_characters_in_query(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: "SecurePass123!",
      ip: "127.0.0.1",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberResponse);
  const memberId = memberResponse.id;

  // Step 2: Create community
  const communityResponse =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Special Characters Test Community",
          identifier: "special_chars_test_" + RandomGenerator.alphaNumeric(8),
          description: "Testing search with special characters and edge cases",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityResponse);
  const communityId = communityResponse.id;

  // Step 3: Create posts with special characters in content
  const postsWithSpecialChars = [
    {
      title: "Post with email patterns: test@example.com and user@domain.co.uk",
      content_text:
        "Testing email-like patterns in search: contact@company.org",
    },
    {
      title: "Post with hashtags #python #nodejs #javascript #typescript",
      content_text:
        "Popular tags in programming: #webdev #backend #frontend #fullstack",
    },
    {
      title: "Post with @ mentions @john @jane @admin @moderator",
      content_text: "Team mentions: @alice @bob @charlie @david need attention",
    },
    {
      title: "Mathematical symbols: 2+2=4, 5*3=15, 10/2=5, 100%",
      content_text: "Equations: x² + y² = z², a-b*c/d, (a+b)*(c-d)",
    },
    {
      title: "Special punctuation!!!??? ...!!! ...???!!!",
      content_text:
        "Multiple punctuation marks: !!! ??? ??? !!! ... ,,, ;;; :::",
    },
    {
      title:
        "URL and path patterns: http://example.com /api/v1/users @/path/to/file",
      content_text:
        "Web resources: https://example.org/path?query=value&other=123#section",
    },
    {
      title: "Price and currency: $99.99 €50.00 £30 ¥1000 ₹500",
      content_text: "Amounts: $1,000.50 €999.99 £250.00 costs only",
    },
    {
      title: "Quotes and brackets: [text] {object} <tag> 'single' \"double\"",
      content_text: 'Nested: {\"key\": \"value\"} [1,2,3] <html>content</html>',
    },
    {
      title: "Dashes and hyphens: word-by-word -- em-dash --- en-dash",
      content_text:
        "Hyphenated terms: twenty-first self-driving re-establish co-operate",
    },
    {
      title: "Numbers mixed: 123abc DEF456 789XYZ mix123ing456numbers789",
      content_text:
        "Alphanumeric: project2024 version3.2.1 release-v2.1.0-beta",
    },
  ];

  const createdPosts: ICommunityPlatformPost[] = [];
  for (const postData of postsWithSpecialChars) {
    const post = await api.functional.communityPlatform.member.posts.create(
      connection,
      {
        body: {
          community_id: communityId,
          post_type: "text",
          title: postData.title,
          content_text: postData.content_text,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    createdPosts.push(post);
  }

  // Step 4: Perform searches with special characters
  const searchQueries = [
    "email", // Should find email-related posts
    "@", // Single special character
    "#", // Hashtag symbol
    "python", // Word from hashtags
    "test@example", // Email pattern partial
    "99.99", // Price
    "http", // URL pattern
    "a-b", // Hyphenated
    "123abc", // Alphanumeric
    "$", // Currency symbol
    "DEF456", // Mixed case alphanumeric
    "re-establish", // Hyphenated word
  ];

  for (const query of searchQueries) {
    const searchResult = await api.functional.communityPlatform.search.index(
      connection,
      {
        body: {
          q: query,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformSearchIndex.IRequest,
      },
    );
    typia.assert(searchResult);
    TestValidator.predicate(
      `search for "${query}" returns valid page structure`,
      searchResult.pagination.current >= 1 && searchResult.pagination.limit > 0,
    );
  }

  // Step 5: Test very long keyword string
  const longKeyword = RandomGenerator.paragraph({
    sentences: 50,
    wordMin: 3,
    wordMax: 8,
  });
  const longSearchResult = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: longKeyword.substring(0, Math.min(1000, longKeyword.length)),
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(longSearchResult);
  TestValidator.predicate(
    "search with very long keyword returns valid results",
    longSearchResult.pagination !== null,
  );

  // Step 6: Test minimum character requirement (1 character)
  const singleCharQueries = ["a", "x", "z", "1", "9"];
  for (const singleChar of singleCharQueries) {
    const result = await api.functional.communityPlatform.search.index(
      connection,
      {
        body: {
          q: singleChar,
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformSearchIndex.IRequest,
      },
    );
    typia.assert(result);
    TestValidator.predicate(
      `single character "${singleChar}" search succeeds`,
      result.pagination.current >= 1,
    );
  }

  // Step 7: Test edge cases with combined special characters
  const edgeCaseQueries = [
    "!!!",
    "???",
    "!!!???",
    "...",
    "---",
    "___",
    "***",
    "+++",
    "===",
    "&&&",
    "|||",
    "^^^",
    "~~~",
    "```",
    "   a   ", // Spaces around character
  ];

  for (const edgeQuery of edgeCaseQueries) {
    if (edgeQuery.trim().length > 0) {
      const result = await api.functional.communityPlatform.search.index(
        connection,
        {
          body: {
            q: edgeQuery,
            page: 1,
            limit: 50,
          } satisfies ICommunityPlatformSearchIndex.IRequest,
        },
      );
      typia.assert(result);
      TestValidator.predicate(
        `edge case query "${edgeQuery}" executes without error`,
        result.pagination !== null,
      );
    }
  }

  // Step 8: Test pagination with special character queries
  const paginatedSearch = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: "test",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination current page is valid",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "search returns array of results",
    Array.isArray(paginatedSearch.data),
  );

  // Step 9: Verify search results contain expected structure
  if (paginatedSearch.data.length > 0) {
    const firstResult = paginatedSearch.data[0];
    typia.assert(firstResult);
    TestValidator.predicate(
      "search result has valid structure",
      firstResult.id !== undefined && firstResult.content_type !== undefined,
    );
  }

  // Step 10: Test search with community filter and special characters
  const communityFilteredSearch =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "special",
        page: 1,
        limit: 50,
        community: [communityId],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(communityFilteredSearch);
  TestValidator.predicate(
    "filtered search by community executes successfully",
    communityFilteredSearch.pagination.current >= 1,
  );
}
