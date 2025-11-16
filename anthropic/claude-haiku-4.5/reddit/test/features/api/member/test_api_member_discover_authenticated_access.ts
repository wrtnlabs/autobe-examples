import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPagination";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTrendingContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingContent";

export async function test_api_member_discover_authenticated_access(
  connection: api.IConnection,
) {
  // Step 1: Create a new authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword =
    RandomGenerator.alphabets(3).toUpperCase() +
    RandomGenerator.alphabets(3) +
    RandomGenerator.alphaNumeric(2) +
    "!@";
  const memberUsername = RandomGenerator.alphabets(5);

  const registrationBody = {
    email: memberEmail,
    username: memberUsername,
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authorizedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(authorizedMember);

  TestValidator.predicate(
    "member account created with valid ID",
    authorizedMember.id !== undefined && authorizedMember.id.length > 0,
  );

  TestValidator.predicate(
    "access token provided",
    authorizedMember.token.access !== undefined &&
      authorizedMember.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token provided",
    authorizedMember.token.refresh !== undefined &&
      authorizedMember.token.refresh.length > 0,
  );

  // Step 2: Access the discovery feed with authenticated member
  const discoverFeed: ICommunityPlatformTrendingContent =
    await api.functional.communityPlatform.member.discover.index(connection);
  typia.assert(discoverFeed);

  TestValidator.predicate(
    "discovery feed contains posts array",
    Array.isArray(discoverFeed.posts),
  );

  TestValidator.predicate(
    "discovery feed contains community recommendations array",
    Array.isArray(discoverFeed.community_recommendations),
  );

  TestValidator.predicate(
    "pagination metadata exists",
    discoverFeed.pagination !== undefined,
  );

  // Step 3: Validate pagination metadata structure
  const pagination: ICommunityPlatformPagination = discoverFeed.pagination;

  TestValidator.predicate(
    "pagination page number is positive integer",
    typeof pagination.page === "number" && pagination.page >= 1,
  );

  TestValidator.predicate(
    "pagination limit is positive integer",
    typeof pagination.limit === "number" && pagination.limit >= 1,
  );

  TestValidator.predicate(
    "pagination total count is non-negative",
    typeof pagination.total === "number" && pagination.total >= 0,
  );

  TestValidator.predicate(
    "pagination has_more is boolean",
    typeof pagination.has_more === "boolean",
  );

  // Step 4: Validate posts structure if available
  if (discoverFeed.posts.length > 0) {
    const firstPost: ICommunityPlatformPost = discoverFeed.posts[0];

    TestValidator.predicate(
      "post has valid ID",
      firstPost.id !== undefined && firstPost.id.length > 0,
    );

    TestValidator.predicate(
      "post has title",
      typeof firstPost.title === "string" && firstPost.title.length > 0,
    );

    TestValidator.predicate(
      "post has post type",
      ["text", "link", "image"].includes(firstPost.post_type),
    );

    TestValidator.predicate(
      "post has vote score",
      typeof firstPost.vote_score === "number" && firstPost.vote_score >= 0,
    );

    TestValidator.predicate(
      "post has upvote count",
      typeof firstPost.upvote_count === "number" && firstPost.upvote_count >= 0,
    );

    TestValidator.predicate(
      "post has downvote count",
      typeof firstPost.downvote_count === "number" &&
        firstPost.downvote_count >= 0,
    );

    TestValidator.predicate(
      "post has comment count",
      typeof firstPost.comment_count === "number" &&
        firstPost.comment_count >= 0,
    );

    TestValidator.predicate(
      "post has creator information",
      firstPost.creator !== undefined && firstPost.creator.id !== undefined,
    );

    TestValidator.predicate(
      "post has community information",
      firstPost.community !== undefined && firstPost.community.id !== undefined,
    );
  }

  // Step 5: Validate community recommendations structure if available
  if (discoverFeed.community_recommendations.length > 0) {
    const firstCommunity: ICommunityPlatformCommunity.ISummary =
      discoverFeed.community_recommendations[0];

    TestValidator.predicate(
      "community has valid ID",
      firstCommunity.id !== undefined && firstCommunity.id.length > 0,
    );

    TestValidator.predicate(
      "community has identifier",
      typeof firstCommunity.identifier === "string" &&
        firstCommunity.identifier.length > 0,
    );

    TestValidator.predicate(
      "community has name",
      typeof firstCommunity.name === "string" && firstCommunity.name.length > 0,
    );

    TestValidator.predicate(
      "community has subscriber count",
      typeof firstCommunity.subscriber_count === "number" &&
        firstCommunity.subscriber_count >= 0,
    );

    TestValidator.predicate(
      "community has post count",
      typeof firstCommunity.post_count === "number" &&
        firstCommunity.post_count >= 0,
    );
  }

  // Step 6: Verify member can access discovery feed immediately after registration
  TestValidator.predicate(
    "authenticated member has access to discovery feed",
    discoverFeed !== undefined && discoverFeed.pagination !== undefined,
  );

  TestValidator.predicate(
    "discovery feed provides personalized content with pagination",
    discoverFeed.pagination.page >= 1 && discoverFeed.pagination.limit >= 1,
  );
}
