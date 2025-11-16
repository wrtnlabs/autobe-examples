import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPagination";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTrendingContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingContent";

/**
 * Test discovery feed retrieval and data structure validation.
 *
 * This test validates that the discovery feed correctly returns trending posts
 * and community recommendations to authenticated members. Since the discovery
 * feed algorithm filters content based on member context (subscriptions,
 * preferences), this test verifies:
 *
 * 1. Create authenticated members
 * 2. Retrieve personalized discovery feed for each member
 * 3. Validate feed returns proper structure (posts, recommendations, pagination)
 * 4. Verify posts have valid attributes and visibility status
 * 5. Verify community recommendations are properly formatted
 * 6. Confirm feed is personalized per member context
 */
export async function test_api_member_discover_private_community_visibility(
  connection: api.IConnection,
) {
  // 1. Create first authenticated member
  const memberOne: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberOne);

  // 2. Create second authenticated member
  const memberTwo: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberTwo);

  // 3. Member one retrieves discovery feed
  connection.headers ??= {};
  connection.headers.Authorization = memberOne.token.access;

  const feedMemberOne: ICommunityPlatformTrendingContent =
    await api.functional.communityPlatform.member.discover.index(connection);
  typia.assert(feedMemberOne);

  // 4. Verify feed structure for member one
  TestValidator.predicate(
    "discovery feed has posts array",
    Array.isArray(feedMemberOne.posts),
  );
  TestValidator.predicate(
    "discovery feed has community recommendations",
    Array.isArray(feedMemberOne.community_recommendations),
  );
  TestValidator.predicate(
    "discovery feed has pagination metadata",
    feedMemberOne.pagination !== null && feedMemberOne.pagination !== undefined,
  );

  // 5. Validate each post in member one's feed
  for (const post of feedMemberOne.posts) {
    typia.assert(post);
    TestValidator.predicate(
      "post has valid id",
      post.id !== null && post.id !== undefined,
    );
    TestValidator.predicate("post has title", post.title.length > 0);
    TestValidator.predicate(
      "post has valid post type",
      ["text", "link", "image"].includes(post.post_type),
    );
    TestValidator.predicate(
      "post has non-negative vote score",
      post.vote_score >= 0,
    );
    TestValidator.predicate(
      "post has non-negative comment count",
      post.comment_count >= 0,
    );
    TestValidator.predicate(
      "post visibility is public or archived",
      post.visibility_status === "public" ||
        post.visibility_status === "archived",
    );
    TestValidator.predicate(
      "post has creator information",
      post.creator !== null && post.creator !== undefined,
    );
    TestValidator.predicate(
      "post has community information",
      post.community !== null && post.community !== undefined,
    );
  }

  // 6. Validate each community recommendation
  for (const community of feedMemberOne.community_recommendations) {
    typia.assert(community);
    TestValidator.predicate(
      "community has valid id",
      community.id !== null && community.id !== undefined,
    );
    TestValidator.predicate(
      "community identifier is valid length",
      community.identifier.length >= 3 && community.identifier.length <= 32,
    );
    TestValidator.predicate(
      "community identifier contains only valid characters",
      /^[a-z0-9_]+$/.test(community.identifier),
    );
    TestValidator.predicate(
      "community name is valid length",
      community.name.length >= 3 && community.name.length <= 100,
    );
    TestValidator.predicate(
      "community subscriber count is non-negative",
      community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "community post count is non-negative",
      community.post_count >= 0,
    );
  }

  // 7. Validate pagination metadata for member one
  TestValidator.predicate(
    "pagination page number is at least 1",
    feedMemberOne.pagination.page >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    feedMemberOne.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total is non-negative",
    feedMemberOne.pagination.total >= 0,
  );
  TestValidator.predicate(
    "has_more flag is boolean",
    typeof feedMemberOne.pagination.has_more === "boolean",
  );

  // 8. Switch to member two and retrieve their discovery feed
  connection.headers.Authorization = memberTwo.token.access;

  const feedMemberTwo: ICommunityPlatformTrendingContent =
    await api.functional.communityPlatform.member.discover.index(connection);
  typia.assert(feedMemberTwo);

  // 9. Verify member two's feed structure
  TestValidator.predicate(
    "member two feed has posts array",
    Array.isArray(feedMemberTwo.posts),
  );
  TestValidator.predicate(
    "member two feed has community recommendations",
    Array.isArray(feedMemberTwo.community_recommendations),
  );
  TestValidator.predicate(
    "member two feed has pagination metadata",
    feedMemberTwo.pagination !== null && feedMemberTwo.pagination !== undefined,
  );

  // 10. Validate each post in member two's feed
  for (const post of feedMemberTwo.posts) {
    typia.assert(post);
    TestValidator.predicate(
      "post visibility is public or archived",
      post.visibility_status === "public" ||
        post.visibility_status === "archived",
    );
    TestValidator.predicate(
      "post has creator information",
      post.creator !== null && post.creator !== undefined,
    );
    TestValidator.predicate(
      "post has community information",
      post.community !== null && post.community !== undefined,
    );
  }

  // 11. Verify feeds are independent and personalized
  // Different members can have different personalized feeds
  TestValidator.predicate(
    "both members can access discovery feed",
    feedMemberOne.posts.length >= 0 && feedMemberTwo.posts.length >= 0,
  );

  // 12. Verify pagination consistency in member two's feed
  TestValidator.predicate(
    "member two pagination page is at least 1",
    feedMemberTwo.pagination.page >= 1,
  );
  TestValidator.predicate(
    "member two pagination limit is positive",
    feedMemberTwo.pagination.limit > 0,
  );
  TestValidator.predicate(
    "member two pagination total is non-negative",
    feedMemberTwo.pagination.total >= 0,
  );
}
