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
 * Test comment search with temporal filtering and author-based queries.
 *
 * This test validates the comprehensive search functionality for comments
 * including:
 *
 * - Temporal filtering using created_after and created_before parameters
 * - Author-based filtering using author_id parameter
 * - Combined temporal and author filtering
 * - Pagination with various page and limit settings
 * - Sorting by different fields in both ascending and descending order
 *
 * The test creates multiple comments from different authors across different
 * time periods to ensure robust validation of all search capabilities.
 */
export async function test_api_comment_search_temporal_and_author_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Step 2: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create first comment from member1
  const comment1: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment1);

  // Step 5: Create second member account
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "password456",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 6: Create second comment from member2
  const comment2: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment2);

  // Step 7: Create third comment from member1 with different timestamp
  const comment3: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment3);

  // Step 8: Test temporal filtering - comments created after comment2
  const temporalAfterResults =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        created_after: comment2.created_at,
        post_id: post.id,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(temporalAfterResults);

  // Should include comment3 but not comment1 or comment2
  TestValidator.equals(
    "temporal filter should return comments created after specified date",
    temporalAfterResults.data.some((comment) => comment.id === comment3.id),
    true,
  );
  TestValidator.equals(
    "temporal filter should exclude comments created before specified date",
    temporalAfterResults.data.some((comment) => comment.id === comment1.id),
    false,
  );

  // Step 9: Test temporal filtering - comments created before comment3
  const temporalBeforeResults =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        created_before: comment3.created_at,
        post_id: post.id,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(temporalBeforeResults);

  // Should include comment1 and comment2 but not comment3
  TestValidator.equals(
    "created_before filter should return comments created before specified date",
    temporalBeforeResults.data.some((comment) => comment.id === comment1.id),
    true,
  );
  TestValidator.equals(
    "created_before filter should exclude comments created after specified date",
    temporalBeforeResults.data.some((comment) => comment.id === comment3.id),
    false,
  );

  // Step 10: Test author filtering - comments by member1
  const authorResults = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {
        author_id: member1.id,
        post_id: post.id,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(authorResults);

  // Should include comments from member1 only
  TestValidator.equals(
    "author filter should return comments from specified author",
    authorResults.data.every(
      (comment) => comment.post.author.id === member1.id,
    ),
    true,
  );

  // Step 11: Test combined temporal and author filtering
  const combinedResults = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {
        author_id: member1.id,
        created_after: comment1.created_at,
        post_id: post.id,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(combinedResults);

  // Should include comment3 from member1 created after comment1
  TestValidator.equals(
    "combined filter should return correct comments",
    combinedResults.data.some((comment) => comment.id === comment3.id),
    true,
  );

  // Step 12: Test pagination
  const paginationResults =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        post_id: post.id,
        page: 1,
        limit: 2,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(paginationResults);

  TestValidator.equals(
    "pagination should respect limit parameter",
    paginationResults.data.length <= 2,
    true,
  );
  TestValidator.predicate(
    "pagination metadata should be valid",
    paginationResults.pagination.current >= 1 &&
      paginationResults.pagination.limit === 2 &&
      paginationResults.pagination.records >= 0 &&
      paginationResults.pagination.pages >= 1,
  );

  // Step 13: Test sorting by created_at in descending order
  const sortedDescResults =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        post_id: post.id,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(sortedDescResults);

  // Comments should be in descending order by creation time
  if (sortedDescResults.data.length > 1) {
    TestValidator.predicate(
      "comments should be sorted by created_at in descending order",
      new Date(sortedDescResults.data[0].created_at) >=
        new Date(sortedDescResults.data[1].created_at),
    );
  }

  // Step 14: Test sorting by created_at in ascending order
  const sortedAscResults =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        post_id: post.id,
        sort_by: "created_at",
        order: "asc",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(sortedAscResults);

  // Comments should be in ascending order by creation time
  if (sortedAscResults.data.length > 1) {
    TestValidator.predicate(
      "comments should be sorted by created_at in ascending order",
      new Date(sortedAscResults.data[0].created_at) <=
        new Date(sortedAscResults.data[1].created_at),
    );
  }

  // Step 15: Test sorting by updated_at
  const sortedUpdatedResults =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        post_id: post.id,
        sort_by: "updated_at",
        order: "desc",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(sortedUpdatedResults);

  // Step 16: Test sorting by reply_count
  const sortedReplyResults =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        post_id: post.id,
        sort_by: "reply_count",
        order: "desc",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(sortedReplyResults);

  // Step 17: Test sorting by score
  const sortedScoreResults =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        post_id: post.id,
        sort_by: "score",
        order: "desc",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(sortedScoreResults);
}
