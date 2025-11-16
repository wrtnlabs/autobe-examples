import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPagination";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTrendingContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingContent";

export async function test_api_member_discover_moderation_compliance(
  connection: api.IConnection,
) {
  // Step 1: Create two authenticated members for the test
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: `user_${RandomGenerator.alphaNumeric(12)}`,
        password: "SecurePassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: `user_${RandomGenerator.alphaNumeric(12)}`,
        password: "SecurePassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 2: Get initial discovery feed state
  const initialFeed: ICommunityPlatformTrendingContent =
    await api.functional.communityPlatform.member.discover.index(connection);
  typia.assert(initialFeed);

  // Verify initial feed structure
  TestValidator.predicate(
    "initial feed has posts array",
    Array.isArray(initialFeed.posts),
  );
  TestValidator.predicate(
    "initial feed has community recommendations",
    Array.isArray(initialFeed.community_recommendations),
  );
  TestValidator.predicate(
    "initial feed has pagination metadata",
    initialFeed.pagination !== undefined && initialFeed.pagination !== null,
  );

  // Step 3: Verify that no posts in the feed have deleted or removed_by_moderator status
  if (initialFeed.posts.length > 0) {
    for (const post of initialFeed.posts) {
      TestValidator.notEquals(
        "post should not have deleted visibility status",
        post.visibility_status,
        "deleted",
      );
      TestValidator.notEquals(
        "post should not have removed_by_moderator visibility status",
        post.visibility_status,
        "removed_by_moderator",
      );
      TestValidator.predicate(
        "post visibility_status should be public or archived",
        post.visibility_status === "public" ||
          post.visibility_status === "archived",
      );
    }
  }

  // Step 4: Verify feed pagination metadata
  TestValidator.predicate(
    "pagination page is positive integer",
    initialFeed.pagination.page >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive integer",
    initialFeed.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination total is non-negative",
    initialFeed.pagination.total >= 0,
  );
  TestValidator.predicate(
    "pagination has_more is boolean",
    typeof initialFeed.pagination.has_more === "boolean",
  );

  // Step 5: Test feed consistency - fetching same page should return posts without deleted/removed status
  const secondFeedRequest: ICommunityPlatformTrendingContent =
    await api.functional.communityPlatform.member.discover.index(connection);
  typia.assert(secondFeedRequest);

  // Verify all posts in second request also don't have problematic statuses
  for (const post of secondFeedRequest.posts) {
    TestValidator.notEquals(
      "subsequent feed post should not be deleted",
      post.visibility_status,
      "deleted",
    );
    TestValidator.notEquals(
      "subsequent feed post should not be removed by moderator",
      post.visibility_status,
      "removed_by_moderator",
    );
  }

  // Step 6: Verify community recommendations exist and have proper structure
  if (secondFeedRequest.community_recommendations.length > 0) {
    for (const community of secondFeedRequest.community_recommendations) {
      TestValidator.predicate(
        "community has id",
        community.id !== undefined && community.id !== null,
      );
      TestValidator.predicate(
        "community has identifier",
        community.identifier !== undefined && community.identifier !== null,
      );
      TestValidator.predicate(
        "community has name",
        community.name !== undefined && community.name !== null,
      );
      TestValidator.predicate(
        "community has subscriber_count",
        typeof community.subscriber_count === "number" &&
          community.subscriber_count >= 0,
      );
      TestValidator.predicate(
        "community has post_count",
        typeof community.post_count === "number" && community.post_count >= 0,
      );
      TestValidator.predicate(
        "community has created_at",
        community.created_at !== undefined && community.created_at !== null,
      );
    }
  }

  // Step 7: Verify moderation filtering consistency across multiple requests
  const multipleFeedRequests = await ArrayUtil.asyncRepeat(3, async () => {
    const feed =
      await api.functional.communityPlatform.member.discover.index(connection);
    typia.assert(feed);
    return feed;
  });

  // All requests should exclude deleted and removed posts
  for (const feedResult of multipleFeedRequests) {
    for (const post of feedResult.posts) {
      TestValidator.notEquals(
        "moderation filtering consistency: no deleted posts",
        post.visibility_status,
        "deleted",
      );
      TestValidator.notEquals(
        "moderation filtering consistency: no moderator-removed posts",
        post.visibility_status,
        "removed_by_moderator",
      );
    }
  }

  // Step 8: Verify post structure for all returned posts
  for (const post of secondFeedRequest.posts) {
    TestValidator.predicate(
      "post has id",
      post.id !== undefined && post.id !== null,
    );
    TestValidator.predicate(
      "post has title",
      post.title !== undefined && post.title !== null,
    );
    TestValidator.predicate(
      "post has post_type",
      ["text", "link", "image"].includes(post.post_type),
    );
    TestValidator.predicate(
      "post has vote_score",
      typeof post.vote_score === "number" && post.vote_score >= 0,
    );
    TestValidator.predicate(
      "post has upvote_count",
      typeof post.upvote_count === "number" && post.upvote_count >= 0,
    );
    TestValidator.predicate(
      "post has downvote_count",
      typeof post.downvote_count === "number" && post.downvote_count >= 0,
    );
    TestValidator.predicate(
      "post has comment_count",
      typeof post.comment_count === "number" && post.comment_count >= 0,
    );
    TestValidator.predicate(
      "post has creator",
      post.creator !== undefined && post.creator !== null,
    );
    TestValidator.predicate(
      "post has community",
      post.community !== undefined && post.community !== null,
    );
    TestValidator.predicate(
      "post has created_at",
      post.created_at !== undefined && post.created_at !== null,
    );
    TestValidator.predicate(
      "post has updated_at",
      post.updated_at !== undefined && post.updated_at !== null,
    );
  }

  // Step 9: Verify member creator information in posts
  for (const post of secondFeedRequest.posts) {
    const creator = post.creator;
    TestValidator.predicate(
      "creator has id",
      creator.id !== undefined && creator.id !== null,
    );
    TestValidator.predicate(
      "creator has username",
      creator.username !== undefined && creator.username !== null,
    );
    TestValidator.predicate(
      "creator has email",
      creator.email !== undefined && creator.email !== null,
    );
    TestValidator.predicate(
      "creator has email_verified",
      typeof creator.email_verified === "boolean",
    );
    TestValidator.predicate(
      "creator has account_status",
      ["active", "suspended", "pending_deletion", "deleted"].includes(
        creator.account_status,
      ),
    );
    TestValidator.predicate(
      "creator has karma_score",
      typeof creator.karma_score === "number" && creator.karma_score >= 0,
    );
    TestValidator.predicate(
      "creator has created_at",
      creator.created_at !== undefined && creator.created_at !== null,
    );
  }

  // Step 10: Verify community information in posts
  for (const post of secondFeedRequest.posts) {
    const community = post.community;
    TestValidator.predicate(
      "community has id",
      community.id !== undefined && community.id !== null,
    );
    TestValidator.predicate(
      "community has identifier",
      community.identifier !== undefined && community.identifier !== null,
    );
    TestValidator.predicate(
      "community has name",
      community.name !== undefined && community.name !== null,
    );
    TestValidator.predicate(
      "community has subscriber_count",
      typeof community.subscriber_count === "number" &&
        community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "community has post_count",
      typeof community.post_count === "number" && community.post_count >= 0,
    );
    TestValidator.predicate(
      "community has created_at",
      community.created_at !== undefined && community.created_at !== null,
    );
  }

  // Step 11: Test empty or small feed handling gracefully
  TestValidator.predicate(
    "feed handles empty or populated state gracefully",
    secondFeedRequest.posts.length >= 0 &&
      Array.isArray(secondFeedRequest.posts),
  );

  TestValidator.predicate(
    "recommendations exist or are empty array",
    Array.isArray(secondFeedRequest.community_recommendations) &&
      secondFeedRequest.community_recommendations.length >= 0,
  );

  // Step 12: Final validation - moderation compliance summary
  TestValidator.predicate(
    "discovery feed moderation compliance verified",
    secondFeedRequest.posts.every(
      (post) =>
        post.visibility_status !== "deleted" &&
        post.visibility_status !== "removed_by_moderator",
    ),
  );
}
