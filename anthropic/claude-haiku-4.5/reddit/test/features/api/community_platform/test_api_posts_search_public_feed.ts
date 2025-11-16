import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_posts_search_public_feed(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for platform setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for organizing communities
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Tech discussions and news",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a member account for posting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "MemberPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community in the category
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech News",
          identifier: `tech_news_${RandomGenerator.alphaNumeric(4)}`,
          description: "Latest technology news and discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create multiple test posts with various types
  const textPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Latest JavaScript Framework Updates",
        content_text: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(textPost);

  const linkPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "link",
        title: "Revolutionary AI Breakthrough",
        content_link_url: "https://example.com/ai-article",
        content_link_title: "AI News",
        content_link_description:
          "A groundbreaking discovery in artificial intelligence",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(linkPost);

  // Step 6: Search/retrieve posts with pagination
  const searchResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 10,
        community_id: community.id,
        visibility_status: "public",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(searchResult);

  // Step 7: Validate response structure and pagination metadata
  TestValidator.predicate(
    "pagination object exists",
    searchResult.pagination !== null && searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate("limit is 10", searchResult.pagination.limit === 10);
  TestValidator.predicate(
    "records count is at least 2",
    searchResult.pagination.records >= 2,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(searchResult.data),
  );
  TestValidator.predicate(
    "data contains at least 2 posts",
    searchResult.data.length >= 2,
  );

  // Validate post summary structure
  const firstPost = searchResult.data[0];
  TestValidator.predicate(
    "post has id",
    firstPost.id !== null && firstPost.id !== undefined,
  );
  TestValidator.predicate(
    "post has title",
    firstPost.title !== null && firstPost.title !== undefined,
  );
  TestValidator.predicate(
    "post has post_type",
    firstPost.post_type !== null && firstPost.post_type !== undefined,
  );
  TestValidator.predicate(
    "post has vote_score",
    firstPost.vote_score !== null && firstPost.vote_score !== undefined,
  );
  TestValidator.predicate(
    "post has upvote_count",
    firstPost.upvote_count !== null && firstPost.upvote_count !== undefined,
  );
  TestValidator.predicate(
    "post has downvote_count",
    firstPost.downvote_count !== null && firstPost.downvote_count !== undefined,
  );
  TestValidator.predicate(
    "post has comment_count",
    firstPost.comment_count !== null && firstPost.comment_count !== undefined,
  );
  TestValidator.predicate(
    "post has creator info",
    firstPost.creator !== null && firstPost.creator !== undefined,
  );
  TestValidator.predicate(
    "post has community info",
    firstPost.community !== null && firstPost.community !== undefined,
  );

  // Test pagination with different limit
  const paginatedResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 1,
        community_id: community.id,
        visibility_status: "public",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "limit parameter affects results",
    paginatedResult.data.length === 1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedResult.pagination.limit,
    1,
  );
}
