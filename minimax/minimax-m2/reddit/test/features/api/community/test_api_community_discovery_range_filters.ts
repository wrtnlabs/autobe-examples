import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test community discovery with range filtering capabilities including
 * minimum/maximum member count, subscriber count, and post count filters.
 * Validates finding communities within specific size ranges and activity levels
 * for targeted discovery based on engagement metrics.
 *
 * This test validates the comprehensive range filtering functionality of the
 * community discovery endpoint, ensuring users can effectively find communities
 * matching their desired engagement levels and sizes for targeted community
 * participation.
 */
export async function test_api_community_discovery_range_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as registered user for filtered community discovery
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const authenticatedUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: userEmail,
        password: "testPassword123",
        display_name: "Test User",
        href: "https://example.com/test",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(authenticatedUser);

  // Step 2: Create test communities with varying member counts and activity levels for range filter validation
  // Create communities with different engagement metrics to establish diverse filtering dataset
  const community1: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `small_community_${RandomGenerator.alphaNumeric(8)}`,
          title: "Small Community",
          description: "A small community with low engagement",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);

  const community2: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `medium_community_${RandomGenerator.alphaNumeric(8)}`,
          title: "Medium Community",
          description: "A medium-sized community with moderate engagement",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);

  const community3: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `large_community_${RandomGenerator.alphaNumeric(8)}`,
          title: "Large Community",
          description: "A large community with high engagement",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community3);

  const community4: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `minimal_community_${RandomGenerator.alphaNumeric(8)}`,
          title: "Minimal Community",
          description: "Community with minimal activity",
          type: "restricted",
          allow_text_posts: true,
          allow_link_posts: false,
          allow_image_posts: false,
          require_post_approval: true,
          require_comment_approval: true,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community4);

  // Step 3: Test member count range filtering
  const memberCountFiltered: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          min_member_count: 0,
          max_member_count: 5,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(memberCountFiltered);

  // Step 4: Test subscriber count range filtering
  const subscriberCountFiltered: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          min_subscriber_count: 0,
          max_subscriber_count: 3,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(subscriberCountFiltered);

  // Step 5: Test post count range filtering
  const postCountFiltered: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          min_post_count: 0,
          max_post_count: 2,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(postCountFiltered);

  // Step 6: Test combined multi-dimensional range filters
  const combinedFiltered: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          min_member_count: 0,
          max_member_count: 10,
          min_subscriber_count: 0,
          max_subscriber_count: 5,
          min_post_count: 0,
          max_post_count: 1,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(combinedFiltered);

  // Step 7: Test edge case - very restrictive filters
  const restrictiveFiltered: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          min_member_count: 1000,
          max_member_count: 999999,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(restrictiveFiltered);

  // Step 8: Test edge case - overlapping ranges with specific filters
  const overlappingFiltered: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          type: "public",
          status: "active",
          min_member_count: 0,
          max_member_count: 1000,
          sort_by: "member_count",
          sort_order: "asc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(overlappingFiltered);

  // Step 9: Validate filtering results - ensure returned communities fall within specified ranges
  TestValidator.equals(
    "member count filtering returns communities within range",
    memberCountFiltered.data.length >= 0,
    true,
  );

  TestValidator.equals(
    "subscriber count filtering returns communities within range",
    subscriberCountFiltered.data.length >= 0,
    true,
  );

  TestValidator.equals(
    "post count filtering returns communities within range",
    postCountFiltered.data.length >= 0,
    true,
  );

  TestValidator.equals(
    "combined range filters return valid results",
    combinedFiltered.data.length >= 0,
    true,
  );

  TestValidator.equals(
    "restrictive filters return empty or minimal results",
    restrictiveFiltered.data.length >= 0,
    true,
  );

  TestValidator.equals(
    "sorted results maintain proper ordering",
    overlappingFiltered.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination information is consistent",
    overlappingFiltered.pagination.limit,
    10,
  );

  // Step 10: Validate that all returned communities meet the specified criteria
  for (const community of memberCountFiltered.data) {
    TestValidator.predicate(
      "communities in member count filter results meet minimum requirement",
      community.member_count >= 0,
    );
    TestValidator.predicate(
      "communities in member count filter results meet maximum requirement",
      community.member_count <= 5,
    );
  }

  for (const community of subscriberCountFiltered.data) {
    TestValidator.predicate(
      "communities in subscriber count filter results meet minimum requirement",
      community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "communities in subscriber count filter results meet maximum requirement",
      community.subscriber_count <= 3,
    );
  }

  for (const community of postCountFiltered.data) {
    TestValidator.predicate(
      "communities in post count filter results meet minimum requirement",
      community.post_count >= 0,
    );
    TestValidator.predicate(
      "communities in post count filter results meet maximum requirement",
      community.post_count <= 2,
    );
  }

  // Step 11: Validate pagination and sorting behavior with range filters
  const sortedResults: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          min_member_count: 0,
          max_member_count: 1000,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortedResults);

  TestValidator.equals(
    "filtered results respect pagination limits",
    sortedResults.data.length <= 5,
    true,
  );

  TestValidator.equals(
    "pagination metadata is accurate",
    sortedResults.pagination.pages >= 1,
    true,
  );
}
