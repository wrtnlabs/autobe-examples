import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Test comprehensive comment search functionality across multiple posts and
 * communities.
 *
 * This E2E test validates the comment search API's ability to filter, sort, and
 * paginate comments across diverse content scenarios. It creates multiple
 * communities, posts, and comments with varied content, then tests search
 * functionality including content keywords, post associations, status
 * filtering, date ranges, and threaded comment relationships.
 */
export async function test_api_comment_search_with_multiple_posts(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create first community
  const community1 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);

  // 3. Create first post in first community
  const post1 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community1.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);

  // 4. Create first comment on initial post
  const comment1 =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: "This is a great post about technology trends",
        community_platform_post_id: post1.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment1);

  // 5. Create second community
  const community2 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);

  // 6. Create second post in different community
  const post2 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community2.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);

  // 7. Create threaded reply comment
  const replyComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: "I agree with your points about AI development",
        parent_id: comment1.id,
        community_platform_post_id: post1.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(replyComment);

  // 8. Create additional comment with different content
  const comment2 =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: "The future of programming looks promising",
        community_platform_post_id: post2.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment2);

  // 9. Test search by content keyword
  const searchResults1 = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {
        search: "technology trends",
        status: "published",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(searchResults1);
  TestValidator.predicate(
    "search should find comments containing keyword",
    searchResults1.data.length > 0,
  );

  // 10. Test search by post ID
  const searchResults2 = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {
        post_id: post1.id,
        status: "published",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(searchResults2);
  TestValidator.predicate(
    "search should find comments for specific post",
    searchResults2.data.length >= 2,
  );

  // 11. Test search by parent comment ID
  const searchResults3 = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {
        parent_id: comment1.id,
        status: "published",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(searchResults3);
  TestValidator.predicate(
    "search should find replies to parent comment",
    searchResults3.data.length === 1,
  );

  // 12. Test pagination functionality
  const searchResults4 = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {
        status: "published",
        page: 1,
        limit: 2,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(searchResults4);
  TestValidator.equals(
    "pagination should return correct number of items",
    searchResults4.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination metadata should be accurate",
    searchResults4.pagination.current === 1 &&
      searchResults4.pagination.limit === 2 &&
      searchResults4.pagination.pages >= 1,
  );

  // 13. Test sorting by different criteria
  const searchResults5 = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {
        status: "published",
        page: 1,
        limit: 10,
        sort_by: "score",
        order: "desc",
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(searchResults5);

  // 14. Validate comment summary structure
  if (searchResults1.data.length > 0) {
    const commentSummary = searchResults1.data[0];
    TestValidator.predicate(
      "comment summary should contain essential information",
      typeof commentSummary.body === "string" &&
        typeof commentSummary.status === "string" &&
        typeof commentSummary.score === "number" &&
        typeof commentSummary.reply_count === "number" &&
        typeof commentSummary.created_at === "string" &&
        typeof commentSummary.updated_at === "string" &&
        typeof commentSummary.post.id === "string" &&
        typeof commentSummary.post.title === "string",
    );
  }
}
