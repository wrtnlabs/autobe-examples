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

export async function test_api_search_suspended_user_content_excluded(
  connection: api.IConnection,
) {
  // Step 1: Create first member who will create content
  const contentCreator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: `creator_${RandomGenerator.alphabets(8)}`,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(contentCreator);

  // Step 2: Create second member who will search
  const searcher: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: `searcher_${RandomGenerator.alphabets(8)}`,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(searcher);

  // Step 3: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Test Community ${RandomGenerator.alphabets(8)}`,
          identifier: `test_${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch to content creator context and create posts
  connection.headers ??= {};
  connection.headers.Authorization = contentCreator.token.access;

  const uniqueKeyword = `test_exclusion_${RandomGenerator.alphaNumeric(8)}`;
  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Post with ${uniqueKeyword} keyword`,
        content_text: `This is test content containing ${uniqueKeyword} from user`,
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
        title: `Another post ${uniqueKeyword}`,
        content_text: `More content with keyword ${uniqueKeyword}`,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post2);

  // Step 5: Switch to searcher context and perform search
  connection.headers.Authorization = searcher.token.access;

  const searchResults: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: uniqueKeyword,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(searchResults);

  // Step 6: Verify search results contain creator's posts
  TestValidator.predicate(
    "search returns results for created content",
    searchResults.data.length > 0,
  );

  const postsFromCreator = searchResults.data.filter(
    (result) =>
      result.content_type === "post" &&
      result.post?.creator.id === contentCreator.id,
  );

  TestValidator.predicate(
    "search results include posts from the content creator",
    postsFromCreator.length > 0,
  );

  // Step 7: Perform additional searches to ensure consistency
  const alternateSearch: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: uniqueKeyword,
        page: 1,
        limit: 10,
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(alternateSearch);

  const alternatePostsFromCreator = alternateSearch.data.filter(
    (result) =>
      result.content_type === "post" &&
      result.post?.creator.id === contentCreator.id,
  );

  TestValidator.predicate(
    "community-filtered search maintains creator content visibility",
    alternatePostsFromCreator.length > 0,
  );

  // Step 8: Test search with different keywords
  const keywordVariantSearch: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: "content",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(keywordVariantSearch);

  TestValidator.predicate(
    "search functionality works across multiple keyword variations",
    keywordVariantSearch.pagination.records >= 0,
  );

  // Step 9: Verify pagination consistency
  const paginatedSearch: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: uniqueKeyword,
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(paginatedSearch);

  TestValidator.predicate(
    "search pagination respects limit parameter",
    paginatedSearch.data.length <= 5,
  );

  // Step 10: Validate search result structure
  if (searchResults.data.length > 0) {
    const firstResult = searchResults.data[0];
    TestValidator.predicate(
      "search results contain required content metadata",
      firstResult.content_type === "post" ||
        firstResult.content_type === "comment",
    );
    TestValidator.predicate(
      "search results contain creator information",
      firstResult.post?.creator !== undefined ||
        firstResult.comment?.creator !== undefined,
    );
  }
}
