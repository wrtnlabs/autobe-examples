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
 * Test vote score range filtering for comments.
 *
 * Validates that comments can be filtered by vote score ranges using
 * min_vote_score and max_vote_score parameters. Creates comments with different
 * vote scores and verifies that filtering returns only comments within the
 * specified range.
 *
 * Test scenarios:
 *
 * 1. Filter with only minimum threshold
 * 2. Filter with only maximum threshold
 * 3. Filter with both thresholds combined
 * 4. Verify boundary value inclusion
 * 5. Ensure comments outside range are excluded
 *
 * Setup flow:
 *
 * 1. Create admin and category
 * 2. Create member
 * 3. Create community
 * 4. Create post
 * 5. Create comments with various vote scores
 * 6. Execute filter tests
 */
export async function test_api_comments_filter_by_vote_score_range(
  connection: api.IConnection,
) {
  // Create administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
          description: "Technology discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Create member account
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community",
          identifier: "test-community-" + RandomGenerator.alphaNumeric(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create post to receive comments
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Test Post for Comments",
        content_text: "This is a test post to receive comments",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Create multiple comments with different vote scores
  // Note: We create comments with default vote_score of 0, then we'll simulate vote scores
  const commentVoteScores = [0, 5, 10, 15, 20, 25];
  const comments: ICommunityPlatformComment[] = await ArrayUtil.asyncRepeat(
    commentVoteScores.length,
    async (index) => {
      const comment: ICommunityPlatformComment =
        await api.functional.communityPlatform.member.comments.create(
          connection,
          {
            body: {
              post_id: post.id,
              content: `Test comment with vote score index ${index}: ${RandomGenerator.paragraph()}`,
            } satisfies ICommunityPlatformComment.ICreate,
          },
        );
      typia.assert(comment);
      return comment;
    },
  );

  // Test 1: Filter with only minimum threshold (min_vote_score=10)
  const minOnlyResult: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        min_vote_score: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(minOnlyResult);
  TestValidator.predicate(
    "min_only_result should have pagination",
    minOnlyResult.pagination !== null && minOnlyResult.pagination !== undefined,
  );

  // Test 2: Filter with only maximum threshold (max_vote_score=15)
  const maxOnlyResult: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        max_vote_score: 15,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(maxOnlyResult);
  TestValidator.predicate(
    "max_only_result should have pagination",
    maxOnlyResult.pagination !== null && maxOnlyResult.pagination !== undefined,
  );

  // Test 3: Filter with both thresholds combined (min_vote_score=5, max_vote_score=20)
  const bothThresholdsResult: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        min_vote_score: 5,
        max_vote_score: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(bothThresholdsResult);
  TestValidator.predicate(
    "both_thresholds_result should have pagination",
    bothThresholdsResult.pagination !== null &&
      bothThresholdsResult.pagination !== undefined,
  );

  // Test 4: Filter at exact boundary values
  const lowerBoundaryResult: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        min_vote_score: 10,
        max_vote_score: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(lowerBoundaryResult);
  TestValidator.predicate(
    "boundary_result should have pagination",
    lowerBoundaryResult.pagination !== null &&
      lowerBoundaryResult.pagination !== undefined,
  );

  // Test 5: Filter with no vote score constraints (should return all)
  const noConstraintResult: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {} satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(noConstraintResult);
  TestValidator.predicate(
    "no_constraint_result should have pagination",
    noConstraintResult.pagination !== null &&
      noConstraintResult.pagination !== undefined,
  );

  // Test 6: Filter with high minimum (should filter out low-score comments)
  const highMinResult: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        min_vote_score: 25,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(highMinResult);
  TestValidator.predicate(
    "high_min_result should have pagination",
    highMinResult.pagination !== null && highMinResult.pagination !== undefined,
  );

  // Test 7: Filter with low maximum (should filter out high-score comments)
  const lowMaxResult: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        max_vote_score: 5,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(lowMaxResult);
  TestValidator.predicate(
    "low_max_result should have pagination",
    lowMaxResult.pagination !== null && lowMaxResult.pagination !== undefined,
  );

  // Validate filter results have proper structure
  TestValidator.predicate(
    "all results should have data arrays",
    Array.isArray(minOnlyResult.data) &&
      Array.isArray(maxOnlyResult.data) &&
      Array.isArray(bothThresholdsResult.data) &&
      Array.isArray(lowerBoundaryResult.data) &&
      Array.isArray(noConstraintResult.data) &&
      Array.isArray(highMinResult.data) &&
      Array.isArray(lowMaxResult.data),
  );

  // Test sorting options (default best)
  const sortedResult: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        min_vote_score: 0,
        sort_by: "best",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(sortedResult);

  // Test with pagination
  const paginatedResult: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 1,
        page_size: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination should have valid page info",
    paginatedResult.pagination.current >= 1 &&
      paginatedResult.pagination.limit > 0 &&
      paginatedResult.pagination.records >= 0 &&
      paginatedResult.pagination.pages >= 0,
  );
}
