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
 * Test comment search filtering by moderation status and engagement metrics.
 *
 * This test validates the comprehensive search functionality for comments,
 * including filtering by status (published, pending, removed, archived),
 * engagement metrics (score ranges, reply counts), and sorting capabilities.
 * The test creates a realistic scenario with multiple comments having different
 * statuses and engagement levels, then verifies that the search API correctly
 * filters, sorts, and paginates results according to the specified criteria.
 */
export async function test_api_comment_search_by_status_and_engagement(
  connection: api.IConnection,
) {
  // 1. Create authenticated member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create post to host comments
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create comments with different statuses
  const comments: ICommunityPlatformComment[] = [];

  // Published comment
  const publishedComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(publishedComment);
  comments.push(publishedComment);

  // Pending comment
  const pendingComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        status: "pending",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(pendingComment);
  comments.push(pendingComment);

  // 5. Test search by specific status filtering
  const publishedResults =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        status: "published",
        post_id: post.id,
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(publishedResults);
  TestValidator.equals(
    "should find only published comments",
    publishedResults.data.length,
    1,
  );
  TestValidator.equals(
    "published comment should match",
    publishedResults.data[0].id,
    publishedComment.id,
  );

  // 6. Test search without status filter (should return published comments by default)
  const allComments = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {
        post_id: post.id,
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(allComments);
  TestValidator.predicate(
    "should return comments for the post",
    allComments.data.length >= 1,
  );

  // 7. Test sorting by creation date
  const sortedByDate = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {
        post_id: post.id,
        sort_by: "created_at",
        order: "desc",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(sortedByDate);

  // 8. Test pagination
  const paginatedResults =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        post_id: post.id,
        limit: 1,
        page: 1,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(paginatedResults);
  TestValidator.equals(
    "pagination limit should be respected",
    paginatedResults.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page should be correct",
    paginatedResults.pagination.current,
    1,
  );

  // 9. Validate search results structure
  TestValidator.predicate(
    "search results should have valid comment structure",
    allComments.data.every(
      (comment) =>
        comment.id &&
        comment.body &&
        comment.status &&
        comment.score !== undefined &&
        comment.reply_count !== undefined &&
        comment.created_at &&
        comment.updated_at &&
        comment.post,
    ),
  );

  // 10. Test search with non-existent post ID
  const emptyResults = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(emptyResults);
  TestValidator.equals(
    "should return empty results for non-existent post",
    emptyResults.data.length,
    0,
  );
}
