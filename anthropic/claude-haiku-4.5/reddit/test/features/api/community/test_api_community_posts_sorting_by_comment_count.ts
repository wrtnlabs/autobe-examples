import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_community_posts_sorting_by_comment_count(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category management
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: "Test Administrator",
        href: "http://localhost/admin",
        referrer: "http://localhost",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);
  connection.headers ??= {};
  connection.headers.Authorization = administrator.token.access;

  // Step 2: Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(4)}`,
          description: "Technology discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for posting and commenting
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `user_${RandomGenerator.alphaNumeric(6)}`,
      password: "MemberPassword123!",
      href: "http://localhost/member",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  connection.headers.Authorization = member.token.access;

  // Step 4: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Comment Sorting Test Community",
          identifier: `comm_${RandomGenerator.alphaNumeric(6)}`,
          description: "Community for testing post sorting by comment count",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create multiple posts with different content
  const posts = await ArrayUtil.asyncRepeat(5, async (index) => {
    const post = await api.functional.communityPlatform.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: `Test Post ${index + 1}`,
          content_text: `Content for post ${index + 1} with different comment counts`,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // Step 6: Create comments to establish varying comment counts
  // Post 0 will have 10 comments
  // Post 1 will have 5 comments
  // Post 2 will have 15 comments
  // Post 3 will have 3 comments
  // Post 4 will have 8 comments
  const commentCounts = [10, 5, 15, 3, 8];

  for (let i = 0; i < posts.length; i++) {
    const targetCount = commentCounts[i];
    for (let j = 0; j < targetCount; j++) {
      const comment =
        await api.functional.communityPlatform.member.comments.create(
          connection,
          {
            body: {
              post_id: posts[i].id,
              content: `Comment ${j + 1} on post ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
            } satisfies ICommunityPlatformComment.ICreate,
          },
        );
      typia.assert(comment);
    }
  }

  // Step 7: Retrieve posts sorted by commentCount in descending order
  const descendingResult =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "commentCount",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(descendingResult);

  // Verify descending order: 15, 10, 8, 5, 3
  const expectedDescendingOrder = [15, 10, 8, 5, 3];
  const descendingCommentCounts = descendingResult.data.map(
    (p) => p.comment_count,
  );

  TestValidator.equals(
    "posts should be sorted in descending order by comment count",
    descendingCommentCounts,
    expectedDescendingOrder,
  );

  // Step 8: Retrieve posts sorted by commentCount in ascending order
  const ascendingResult =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "commentCount",
        sort_order: "asc",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(ascendingResult);

  // Verify ascending order: 3, 5, 8, 10, 15
  const expectedAscendingOrder = [3, 5, 8, 10, 15];
  const ascendingCommentCounts = ascendingResult.data.map(
    (p) => p.comment_count,
  );

  TestValidator.equals(
    "posts should be sorted in ascending order by comment count",
    ascendingCommentCounts,
    expectedAscendingOrder,
  );

  // Step 9: Test pagination with sorting
  const paginatedResult =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 3,
        sort_by: "commentCount",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(paginatedResult);

  // First 3 items should be in descending order: 15, 10, 8
  const paginatedCommentCounts = paginatedResult.data.map(
    (p) => p.comment_count,
  );
  const expectedFirstPage = [15, 10, 8];

  TestValidator.equals(
    "first page should contain posts sorted by comment count in descending order",
    paginatedCommentCounts,
    expectedFirstPage,
  );

  // Step 10: Validate pagination info
  TestValidator.predicate(
    "pagination should indicate 2 total pages with limit of 3",
    paginatedResult.pagination.pages === 2,
  );

  TestValidator.predicate(
    "pagination should show correct total records",
    paginatedResult.pagination.records === 5,
  );

  // Get second page
  const secondPageResult =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 2,
        limit: 3,
        sort_by: "commentCount",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(secondPageResult);

  // Second page should contain: 5, 3
  const secondPageCommentCounts = secondPageResult.data.map(
    (p) => p.comment_count,
  );
  const expectedSecondPage = [5, 3];

  TestValidator.equals(
    "second page should contain remaining posts in sorted order",
    secondPageCommentCounts,
    expectedSecondPage,
  );
}
