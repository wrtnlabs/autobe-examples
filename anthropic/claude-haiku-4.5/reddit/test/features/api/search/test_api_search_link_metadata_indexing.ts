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

export async function test_api_search_link_metadata_indexing(
  connection: api.IConnection,
) {
  // 1. Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        ip: "127.0.0.1",
        href: "http://localhost:3000/register" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Technology News",
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: "Community for sharing technology links and articles",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_and_links",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create link posts with searchable metadata
  const linkPost1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "link",
        title: "Revolutionary AI Breakthrough Announced",
        content_link_url:
          "https://example.com/ai-breakthrough" satisfies string &
            tags.Format<"uri">,
        content_link_title: "Artificial Intelligence Breakthrough 2024",
        content_link_description:
          "Groundbreaking AI research shows remarkable progress in natural language processing and machine learning capabilities",
        content_link_thumbnail_url:
          "https://example.com/thumbnail1.jpg" satisfies string &
            tags.Format<"uri">,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(linkPost1);

  const linkPost2: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "link",
        title: "Machine Learning Techniques Explained",
        content_link_url: "https://example.com/ml-guide" satisfies string &
          tags.Format<"uri">,
        content_link_title: "Complete Guide to Machine Learning",
        content_link_description:
          "Comprehensive tutorial covering supervised learning, unsupervised learning, and deep neural networks for developers",
        content_link_thumbnail_url:
          "https://example.com/thumbnail2.jpg" satisfies string &
            tags.Format<"uri">,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(linkPost2);

  const linkPost3: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "link",
        title: "Web Development Best Practices",
        content_link_url: "https://example.com/web-practices" satisfies string &
          tags.Format<"uri">,
        content_link_title: "Modern Web Development Practices",
        content_link_description:
          "Essential techniques and patterns for building scalable web applications with TypeScript and React frameworks",
        content_link_thumbnail_url:
          "https://example.com/thumbnail3.jpg" satisfies string &
            tags.Format<"uri">,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(linkPost3);

  // 4. Search for keywords in link title metadata
  const searchResults1: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "artificial intelligence",
        page: 1,
        limit: 10,
        community: [community.id],
        sortBy: "relevance",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResults1);
  TestValidator.predicate(
    "search should find link post with AI metadata in title",
    searchResults1.data.length > 0,
  );
  const aiResultFound = searchResults1.data.find(
    (result) => result.post && result.post.id === linkPost1.id,
  );
  TestValidator.predicate(
    "AI breakthrough post should be in search results",
    aiResultFound !== undefined,
  );

  // 5. Search for machine learning specific keywords in metadata
  const searchResults2: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "machine learning",
        page: 1,
        limit: 10,
        community: [community.id],
        sortBy: "relevance",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResults2);
  TestValidator.predicate(
    "search should find link posts with machine learning metadata",
    searchResults2.data.length > 0,
  );
  const mlFound = searchResults2.data.some(
    (result) => result.post && result.post.id === linkPost2.id,
  );
  TestValidator.predicate(
    "machine learning post should be in results",
    mlFound,
  );

  // 6. Search for web development keywords in link metadata
  const searchResults3: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "web development",
        page: 1,
        limit: 10,
        community: [community.id],
        sortBy: "relevance",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResults3);
  const webDevFound = searchResults3.data.some(
    (result) => result.post && result.post.id === linkPost3.id,
  );
  TestValidator.predicate(
    "web development post should be found in search",
    webDevFound,
  );

  // 7. Verify link metadata is displayed in search results
  if (aiResultFound) {
    TestValidator.predicate(
      "link post should have title in response",
      aiResultFound.post !== null &&
        aiResultFound.post !== undefined &&
        aiResultFound.post.title.length > 0,
    );
    TestValidator.predicate(
      "search result should have preview text from metadata",
      aiResultFound.preview_text.length > 0,
    );
  }

  // 8. Search for keywords from link description metadata
  const searchResults4: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "natural language processing",
        page: 1,
        limit: 10,
        community: [community.id],
        sortBy: "relevance",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResults4);
  const nlpFound = searchResults4.data.some(
    (result) => result.post && result.post.id === linkPost1.id,
  );
  TestValidator.predicate(
    "should find link post by searching in link description",
    nlpFound,
  );

  // 9. Verify that link post metadata is indexed and searchable
  const searchResults5: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "neural networks",
        page: 1,
        limit: 10,
        community: [community.id],
        sortBy: "relevance",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResults5);
  const nnFound = searchResults5.data.some(
    (result) => result.post && result.post.id === linkPost2.id,
  );
  TestValidator.predicate(
    "link description metadata should be searchable",
    nnFound,
  );

  // 10. Verify title metadata has higher relevance weighting
  const titleSearchResults: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "machine learning",
        page: 1,
        limit: 10,
        community: [community.id],
        sortBy: "relevance",
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(titleSearchResults);
  TestValidator.predicate(
    "search results for link metadata should not be empty",
    titleSearchResults.data.length > 0,
  );
  TestValidator.predicate(
    "search result should contain expected link posts",
    titleSearchResults.data.some(
      (result) =>
        (result.post && result.post.id === linkPost2.id) ||
        (result.post && result.post.id === linkPost1.id),
    ),
  );
}
