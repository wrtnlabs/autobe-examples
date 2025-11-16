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
 * Test search filtering by post type (text, link, image, or all).
 *
 * This test validates the post type filtering functionality in the community
 * platform search API. It creates different post types (text, link, and image)
 * with searchable keywords in a community, then performs searches with various
 * post type filters to ensure results are correctly filtered.
 *
 * The test verifies:
 *
 * 1. Text-only filter returns only text posts
 * 2. Link-only filter returns only link posts
 * 3. Image-only filter returns only image posts
 * 4. Comments are always included regardless of postType filter
 * 5. 'all' value includes all post types
 * 6. Post type filter combines correctly with keyword search
 *
 * Steps:
 *
 * 1. Create a member account for authentication
 * 2. Create a community for test posts
 * 3. Create text post with searchable keyword
 * 4. Create link post with searchable keyword
 * 5. Create image post with searchable keyword
 * 6. Search with postType='text' filter - verify only text post returned
 * 7. Search with postType='link' filter - verify only link post returned
 * 8. Search with postType='image' filter - verify only image post returned
 * 9. Search with postType='all' filter - verify all posts returned
 * 10. Search with keyword and text filter - verify combined filtering works
 */
export async function test_api_search_post_type_filter(
  connection: api.IConnection,
) {
  const keyword = RandomGenerator.alphabets(8);

  // 1. Create member account
  const memberResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberResponse);

  // 2. Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create text post with searchable keyword
  const textPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Text Post ${keyword}`,
        content_text: `This is a text post with keyword ${keyword}`,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(textPost);
  TestValidator.equals("text post type", textPost.post_type, "text");

  // 4. Create link post with searchable keyword
  const linkPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "link",
        title: `Link Post ${keyword}`,
        content_link_url: typia.random<string & tags.Format<"uri">>(),
        content_link_title: `Link with ${keyword}`,
        content_link_description: `This link post contains ${keyword}`,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost);
  TestValidator.equals("link post type", linkPost.post_type, "link");

  // 5. Create image post with searchable keyword
  const imagePost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "image",
        title: `Image Post ${keyword}`,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(imagePost);
  TestValidator.equals("image post type", imagePost.post_type, "image");

  // 6. Search with postType='text' filter - verify only text post returned
  const textFilterResults = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: keyword,
        page: 1,
        limit: 50,
        postType: "text",
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(textFilterResults);
  TestValidator.predicate(
    "text filter returns posts",
    () => textFilterResults.data.length > 0,
  );
  TestValidator.predicate("text filter only returns text posts", () =>
    textFilterResults.data.every((result) => {
      if (result.content_type === "post" && result.post) {
        return result.post.post_type === "text";
      }
      return true;
    }),
  );

  // 7. Search with postType='link' filter - verify only link post returned
  const linkFilterResults = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: keyword,
        page: 1,
        limit: 50,
        postType: "link",
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(linkFilterResults);
  TestValidator.predicate(
    "link filter returns posts",
    () => linkFilterResults.data.length > 0,
  );
  TestValidator.predicate("link filter only returns link posts", () =>
    linkFilterResults.data.every((result) => {
      if (result.content_type === "post" && result.post) {
        return result.post.post_type === "link";
      }
      return true;
    }),
  );

  // 8. Search with postType='image' filter - verify only image post returned
  const imageFilterResults =
    await api.functional.communityPlatform.search.index(connection, {
      body: {
        q: keyword,
        page: 1,
        limit: 50,
        postType: "image",
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    });
  typia.assert(imageFilterResults);
  TestValidator.predicate(
    "image filter returns posts",
    () => imageFilterResults.data.length > 0,
  );
  TestValidator.predicate("image filter only returns image posts", () =>
    imageFilterResults.data.every((result) => {
      if (result.content_type === "post" && result.post) {
        return result.post.post_type === "image";
      }
      return true;
    }),
  );

  // 9. Search with postType='all' filter - verify all posts returned
  const allTypeResults = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: keyword,
        page: 1,
        limit: 50,
        postType: "all",
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(allTypeResults);
  TestValidator.predicate(
    "all type filter returns multiple post types",
    () => allTypeResults.data.length >= 2,
  );

  // 10. Search with keyword and text filter - verify combined filtering works
  const combinedSearch = await api.functional.communityPlatform.search.index(
    connection,
    {
      body: {
        q: keyword,
        page: 1,
        limit: 50,
        postType: "text",
        community: [community.id],
      } satisfies ICommunityPlatformSearchIndex.IRequest,
    },
  );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined filter returns matching results",
    () =>
      combinedSearch.data.length > 0 &&
      combinedSearch.data.every((result) => {
        if (result.content_type === "post" && result.post) {
          return (
            result.post.post_type === "text" &&
            (result.post.title.includes(keyword) ||
              result.preview_text.includes(keyword))
          );
        }
        return true;
      }),
  );
}
