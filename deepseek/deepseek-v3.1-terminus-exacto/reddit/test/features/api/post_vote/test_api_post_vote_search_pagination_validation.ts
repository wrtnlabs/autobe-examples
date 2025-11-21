import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Comprehensive test for vote search pagination functionality.
 *
 * This test validates that moderators can efficiently browse voting histories
 * through proper pagination parameters. Since vote creation functionality is
 * not available in the provided API, this test focuses on validating the
 * pagination API's behavior with various parameter configurations.
 *
 * Key validation points:
 *
 * 1. Moderator authentication setup
 * 2. Testing pagination with different page and limit parameters
 * 3. Validating pagination metadata structure and calculations
 * 4. Ensuring proper handling of edge cases
 * 5. Testing API response structure and type safety
 *
 * The test ensures that the vote search API correctly handles pagination
 * requests and returns properly structured responses for moderation workflows.
 */
export async function test_api_post_vote_search_pagination_validation(
  connection: api.IConnection,
) {
  // 1. Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "global",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create a post that will be used for vote search
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Test pagination with different configurations
  const testCases = [
    { page: 1, limit: 10 }, // First page with moderate limit
    { page: 2, limit: 5 }, // Second page with smaller limit
    { page: 3, limit: 15 }, // Third page with larger limit
    { page: 1, limit: 100 }, // Maximum limit test
  ];

  for (const testCase of testCases) {
    const searchResult =
      await api.functional.communityPlatform.moderator.posts.votes.index(
        connection,
        {
          postId: post.id,
          body: {
            page: testCase.page,
            limit: testCase.limit,
          } satisfies ICommunityPlatformVote.IRequest,
        },
      );
    typia.assert(searchResult);

    // Validate pagination metadata structure
    TestValidator.predicate(
      `pagination object exists for page ${testCase.page} limit ${testCase.limit}`,
      searchResult.pagination !== undefined,
    );

    // Validate pagination properties exist and have correct types
    TestValidator.predicate(
      `current page is valid for page ${testCase.page} limit ${testCase.limit}`,
      typeof searchResult.pagination.current === "number" &&
        searchResult.pagination.current >= 0,
    );

    TestValidator.predicate(
      `page limit is valid for page ${testCase.page} limit ${testCase.limit}`,
      typeof searchResult.pagination.limit === "number" &&
        searchResult.pagination.limit > 0,
    );

    TestValidator.predicate(
      `total records is valid for page ${testCase.page} limit ${testCase.limit}`,
      typeof searchResult.pagination.records === "number" &&
        searchResult.pagination.records >= 0,
    );

    TestValidator.predicate(
      `total pages is valid for page ${testCase.page} limit ${testCase.limit}`,
      typeof searchResult.pagination.pages === "number" &&
        searchResult.pagination.pages >= 0,
    );

    // Validate data array structure
    TestValidator.predicate(
      `data array exists for page ${testCase.page} limit ${testCase.limit}`,
      Array.isArray(searchResult.data),
    );

    // Validate that data array size does not exceed limit
    TestValidator.predicate(
      `data array size within limit for page ${testCase.page} limit ${testCase.limit}`,
      searchResult.data.length <= testCase.limit,
    );
  }

  // 4. Test edge case: page beyond total pages
  const edgeCaseResult =
    await api.functional.communityPlatform.moderator.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1000, // Very high page number
          limit: 10,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(edgeCaseResult);

  // Should return valid pagination structure even for non-existent page
  TestValidator.predicate(
    "edge case pagination structure is valid",
    edgeCaseResult.pagination !== undefined,
  );

  // 5. Test default pagination (no parameters)
  const defaultResult =
    await api.functional.communityPlatform.moderator.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {} satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(defaultResult);

  // Validate default pagination structure
  TestValidator.predicate(
    "default pagination has valid structure",
    defaultResult.pagination !== undefined,
  );

  TestValidator.predicate(
    "default pagination has reasonable limit",
    defaultResult.pagination.limit > 0 && defaultResult.pagination.limit <= 100,
  );

  // 6. Test with minimum valid parameters
  const minParamsResult =
    await api.functional.communityPlatform.moderator.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(minParamsResult);

  TestValidator.predicate(
    "minimum parameters pagination is valid",
    minParamsResult.pagination !== undefined,
  );
}
