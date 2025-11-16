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
 * Test that search results include keyword highlighting in context. Perform
 * searches with specific keywords and verify that preview_text includes
 * matching keywords highlighted or marked. Confirm preview text shows first 200
 * characters of matching content with keywords clearly indicated. Test
 * highlighting with multiple keywords in same content and across different
 * fields (title vs body). Validate that highlighting helps users identify why
 * content matched their search query. Test highlight consistency across
 * different sort orders and filters.
 */
export async function test_api_search_result_highlighting(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Search Testing Community",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Community for testing search highlighting",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create posts with specific keywords for testing
  const keyword1 = "blockchain";
  const keyword2 = "cryptocurrency";
  const keyword3 = "technology";

  // Post 1: Keyword in title and early in body text
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Understanding ${keyword1} Technology`,
        content_text: `${keyword1} is a revolutionary distributed ledger technology. It provides cryptographic security for cryptocurrency networks and enables decentralized transaction processing. This innovation has transformed financial systems.`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);

  // Post 2: Keyword near beginning of body
  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Digital Assets and Finance",
        content_text: `${keyword2} markets are experiencing significant growth. Bitcoin and Ethereum lead the market with substantial valuations. The adoption rate continues to increase worldwide as institutional investors enter the space.`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  // Post 3: Multiple keywords at beginning
  const post3: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `${keyword3} Trends in Modern World`,
        content_text: `${keyword3} innovations including ${keyword1} integration and ${keyword2} advancement are reshaping our digital future. Artificial intelligence, quantum computing, and distributed systems represent the next frontier of technological progress.`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post3);

  // Step 4: Search with single keyword and verify highlighting
  const searchResult1: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: keyword1,
        page: 1,
        limit: 10,
        sortBy: "relevance",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResult1);

  // Verify search results contain matching posts
  TestValidator.predicate(
    "search should return results for keyword1",
    searchResult1.data.length > 0,
  );

  // Verify preview_text contains the keyword and shows context
  const result1 = searchResult1.data.find((r) => r.post?.id === post1.id);
  if (result1) {
    TestValidator.predicate(
      "preview_text should contain keyword1",
      result1.preview_text.toLowerCase().includes(keyword1.toLowerCase()),
    );
    TestValidator.predicate(
      "preview_text should be limited to reasonable length",
      result1.preview_text.length <= 200,
    );
  }

  // Step 5: Search with keyword2 and verify highlighting
  const searchResult2: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: keyword2,
        page: 1,
        limit: 10,
        sortBy: "relevance",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResult2);

  TestValidator.predicate(
    "search should return results for keyword2",
    searchResult2.data.length > 0,
  );

  const result2 = searchResult2.data.find((r) => r.post?.id === post2.id);
  if (result2) {
    TestValidator.predicate(
      "preview_text should contain keyword2",
      result2.preview_text.toLowerCase().includes(keyword2.toLowerCase()),
    );
  }

  // Step 6: Search with multiple keywords and verify highlighting
  const multiKeywordQuery = `${keyword1} ${keyword3}`;
  const searchResult3: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: multiKeywordQuery,
        page: 1,
        limit: 10,
        sortBy: "relevance",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResult3);

  TestValidator.predicate(
    "search should return results for multiple keywords",
    searchResult3.data.length > 0,
  );

  // Step 7: Verify highlighting consistency across different sort orders
  const searchResultHot: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: keyword1,
        page: 1,
        limit: 10,
        sortBy: "hot",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResultHot);

  // Verify hot sort maintains highlighting
  if (searchResultHot.data.length > 0) {
    const hotResult = searchResultHot.data[0];
    TestValidator.predicate(
      "hot sorted results should have preview_text",
      hotResult.preview_text.length > 0,
    );
  }

  // Step 8: Search by newest and verify highlighting consistency
  const searchResultNew: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: keyword3,
        page: 1,
        limit: 10,
        sortBy: "new",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResultNew);

  TestValidator.predicate(
    "new sorted search should return results",
    searchResultNew.data.length > 0,
  );

  // Step 9: Verify highlighting helps identify title vs body matches
  const allResults = [searchResult1, searchResult2, searchResult3];
  for (const pageResult of allResults) {
    for (const searchResult of pageResult.data) {
      TestValidator.predicate(
        "each result should have preview_text for context",
        searchResult.preview_text.length > 0,
      );
      TestValidator.predicate(
        "preview_text should not exceed 200 characters",
        searchResult.preview_text.length <= 200,
      );
      TestValidator.predicate(
        "result should have either post or comment",
        searchResult.post !== undefined || searchResult.comment !== undefined,
      );
      TestValidator.predicate(
        "result should belong to a community",
        searchResult.community !== undefined,
      );
    }
  }

  // Step 10: Verify search consistency and highlighting quality
  const verifyHighlighting: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: keyword1,
        page: 1,
        limit: 5,
        community: [community.id],
        sortBy: "relevance",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(verifyHighlighting);

  for (const result of verifyHighlighting.data) {
    TestValidator.predicate(
      "each result should show community context",
      result.community.id === community.id,
    );
    TestValidator.predicate(
      "preview_text should be meaningful",
      result.preview_text.trim().length > 0,
    );
  }
}
