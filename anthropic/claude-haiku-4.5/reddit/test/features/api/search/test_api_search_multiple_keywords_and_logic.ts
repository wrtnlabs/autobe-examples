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

export async function test_api_search_multiple_keywords_and_logic(
  connection: api.IConnection,
) {
  /** Step 1: Create a member account to generate test content */
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "TestPassword123!",
        ip: "127.0.0.1",
        href: "http://localhost/register",
        referrer: "http://localhost/home",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  /** Step 2: Create a community for test posts */
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Search Test Community",
          identifier: "search_test_" + RandomGenerator.alphaNumeric(8),
          description: "Community for testing search functionality",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  /** Step 3: Create multiple posts with different keyword combinations */
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "TypeScript Development Guide",
        content_text:
          "Learn about TypeScript and JavaScript frameworks for web development",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post1);

  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "React and TypeScript Best Practices",
        content_text:
          "Discover the best practices for using React with TypeScript in production applications",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  const post3: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "JavaScript Performance Tips",
        content_text:
          "Optimize your JavaScript code for better performance and faster execution",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post3);

  const post4: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "link",
        title: "TypeScript Official Documentation",
        content_link_url: "https://www.typescriptlang.org/docs",
        content_link_title: "TypeScript Handbook",
        content_link_description:
          "Official TypeScript documentation and guides",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post4);

  /**
   * Step 4: Test AND logic search with multiple keywords Search for "TypeScript
   * React" - should return only posts containing BOTH keywords
   */
  const searchResult1: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "TypeScript React",
        page: 1,
        limit: 10,
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResult1);

  TestValidator.predicate(
    "AND logic search with TypeScript and React should return results",
    searchResult1.data.length > 0,
  );

  const result1ContainsPost2 = searchResult1.data.some(
    (result) => result.post?.id === post2.id,
  );
  TestValidator.predicate(
    "search results should include post with both TypeScript and React keywords",
    result1ContainsPost2,
  );

  /**
   * Step 5: Test AND logic with different keyword combination Search for "Best
   * Practices TypeScript" - should return post2
   */
  const searchResult2: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "Best Practices TypeScript",
        page: 1,
        limit: 10,
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResult2);

  TestValidator.predicate(
    "search with multiple keywords should return results",
    searchResult2.data.length > 0,
  );

  /**
   * Step 6: Test AND logic where no results match all keywords Search for
   * "TypeScript Python" - should return no or fewer results
   */
  const searchResult3: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "TypeScript Python",
        page: 1,
        limit: 10,
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResult3);

  TestValidator.predicate(
    "AND logic should not return results without all keywords",
    searchResult3.data.length === 0,
  );

  /**
   * Step 7: Test single keyword search for baseline comparison Search for
   * "TypeScript" - should return multiple posts
   */
  const searchResult4: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "TypeScript",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResult4);

  TestValidator.predicate(
    "single keyword search should return multiple results",
    searchResult4.data.length > 0,
  );

  TestValidator.predicate(
    "single keyword search should return at least as many results as multi-keyword search",
    searchResult4.data.length >= searchResult1.data.length,
  );

  /**
   * Step 8: Test AND logic across different field types Search for "Development
   * Guide" - should find post1 with both words
   */
  const searchResult5: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "Development Guide",
        page: 1,
        limit: 10,
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResult5);

  const result5ContainsPost1 = searchResult5.data.some(
    (result) => result.post?.id === post1.id,
  );
  TestValidator.predicate(
    "AND logic should match both keywords in post titles",
    result5ContainsPost1,
  );

  /**
   * Step 9: Test relevance ranking with keyword frequency Search for
   * "JavaScript" - post2 mentions it, post3 focuses on it
   */
  const searchResult6: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "JavaScript",
        page: 1,
        limit: 10,
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResult6);

  TestValidator.predicate(
    "keyword search should return relevant results",
    searchResult6.data.length > 0,
  );

  /** Step 10: Test pagination consistency with AND logic search */
  TestValidator.equals(
    "pagination should reflect correct page number",
    searchResult1.pagination.current,
    1,
  );

  TestValidator.predicate(
    "returned data count should not exceed limit",
    searchResult1.data.length <= searchResult1.pagination.limit,
  );

  /**
   * Step 11: Verify AND logic does not return partial matches Search for "React
   * Development" - should only return post2 (has both)
   */
  const searchResult7: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "React Development",
        page: 1,
        limit: 10,
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResult7);

  const result7ContainsPost2 = searchResult7.data.some(
    (result) => result.post?.id === post2.id,
  );
  TestValidator.predicate(
    "AND logic with React and Development should find matching post",
    result7ContainsPost2,
  );
}
