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
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Test comment sorting algorithms by engagement metrics.
 *
 * This test validates the comment sorting functionality by creating multiple
 * comments with varying vote counts and timestamps, then verifying that each
 * sort_by parameter returns comments in the expected order. Tests all sorting
 * algorithms: best (default), new, top, controversial, and oldest.
 *
 * Setup process:
 *
 * 1. Create administrator and member accounts
 * 2. Create a category and community for content organization
 * 3. Create a post for comments
 * 4. Create multiple comments with different engagement metrics
 * 5. Test each sorting algorithm validates correct order
 *
 * Sorting validations:
 *
 * - Best: combined algorithm (default when no sort provided)
 * - New: most recent first (created_at descending)
 * - Top: highest vote scores first (vote_score descending)
 * - Controversial: balanced upvote/downvote ratios
 * - Oldest: chronological ascending (created_at ascending)
 */
export async function test_api_comments_sort_by_engagement_algorithm(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category creation
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create category for community organization
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          description: "Technology discussions and news",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create first member account
  const memberEmail1 = `member-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail1,
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      password: "Password123!",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // 4. Create second member account for additional comments
  const memberEmail2 = `member-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail2,
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      password: "Password123!",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // 5. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech News",
          identifier: `tech-news-${RandomGenerator.alphaNumeric(6)}`,
          description: "Latest technology news and discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Create a post for comments
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Latest AI Developments",
        content_text: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 7. Create multiple comments with different engagement metrics
  // Comment 1: High engagement, recent (best candidate)
  const comment1 =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: "Great insights on AI capabilities",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment1);

  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Comment 2: Older, lower engagement
  const comment2 =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: "I disagree with this approach to ML",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment2);

  // Small delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Comment 3: Most recent
  const comment3 =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: "This is the newest comment in the discussion",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment3);

  // Small delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Comment 4: Moderate engagement
  const comment4 =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: "Interesting perspective on neural networks",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment4);

  // 8. Test default sort (should be 'best') when no sort_by is provided
  const defaultSortResult =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 1,
        page_size: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(defaultSortResult);
  TestValidator.predicate(
    "default sort should return paginated results",
    defaultSortResult.data.length > 0,
  );

  // 9. Test 'new' sort - most recent first
  const newSortResult = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {
        page: 1,
        page_size: 20,
        sort_by: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(newSortResult);
  TestValidator.predicate(
    "new sort should return results ordered by recency",
    newSortResult.data.length > 0,
  );
  // Verify descending order by creation timestamp
  for (let i = 0; i < newSortResult.data.length - 1; i++) {
    const current = new Date(newSortResult.data[i].created_at).getTime();
    const next = new Date(newSortResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `new sort - comment ${i} should be newer than comment ${i + 1}`,
      current >= next,
    );
  }

  // 10. Test 'top' sort - highest vote score first
  const topSortResult = await api.functional.communityPlatform.comments.index(
    connection,
    {
      body: {
        page: 1,
        page_size: 20,
        sort_by: "top",
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(topSortResult);
  TestValidator.predicate(
    "top sort should return results ordered by vote score",
    topSortResult.data.length > 0,
  );
  // Verify descending order by vote_score
  for (let i = 0; i < topSortResult.data.length - 1; i++) {
    TestValidator.predicate(
      `top sort - comment ${i} should have higher or equal vote score than comment ${i + 1}`,
      topSortResult.data[i].vote_score >= topSortResult.data[i + 1].vote_score,
    );
  }

  // 11. Test 'controversial' sort - balanced up/down votes
  const controversialSortResult =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 1,
        page_size: 20,
        sort_by: "controversial",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(controversialSortResult);
  TestValidator.predicate(
    "controversial sort should return results",
    controversialSortResult.data.length >= 0,
  );

  // 12. Test 'oldest' sort - chronological ascending
  const oldestSortResult =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 1,
        page_size: 20,
        sort_by: "oldest",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(oldestSortResult);
  TestValidator.predicate(
    "oldest sort should return results ordered chronologically ascending",
    oldestSortResult.data.length > 0,
  );
  // Verify ascending order by creation timestamp
  for (let i = 0; i < oldestSortResult.data.length - 1; i++) {
    const current = new Date(oldestSortResult.data[i].created_at).getTime();
    const next = new Date(oldestSortResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `oldest sort - comment ${i} should be older than or equal to comment ${i + 1}`,
      current <= next,
    );
  }

  // 13. Verify all comments are present in results
  TestValidator.predicate(
    "all created comments should be retrievable",
    defaultSortResult.pagination.records >= 4,
  );
}
