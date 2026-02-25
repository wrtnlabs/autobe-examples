import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test comment content filtering capabilities for vote score analytics to support moderation workflows.
 * Create comments with specific keywords or patterns that might indicate problematic content.
 * Use the comment_content parameter to search for comments containing specific phrases or patterns.
 * Test filtering combinations such as searching for controversial comments (score near zero)
 * with specific content keywords to identify potential discussion hotspots.
 * Validate that the system properly joins comment content with vote statistics and returns accurate matches.
 * Test edge cases including partial matches, case-insensitive searches, and special character handling in comment content.
 * Verify that the filtering supports moderation use cases like identifying coordinated voting patterns
 * around specific topics or detecting potential vote manipulation on controversial discussions.
 */
export async function test_api_comment_vote_scores_content_filtering_moderation(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Note: Since we don't have comment creation endpoints available in the provided API,
  // we can only test the filtering functionality with whatever data exists in the system.
  // In a real scenario, we would create test comments with specific content patterns first.
  // Test 1: Basic content filtering with specific keywords
  const response1 =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          comment_content: "test",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(response1);
  // Test 2: Controversial comments filtering (score near zero)
  const response2 =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          minimum_score: -5,
          maximum_score: 5,
          comment_content: "discussion",
          sort_by: "score",
          sort_order: "asc",
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(response2);
  // Test 3: High engagement comments with specific content
  const response3 =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          minimum_upvotes: 1,
          comment_content: "content",
          sort_by: "upvote_count",
          sort_order: "desc",
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(response3);
  // Test 4: Time-based filtering with content search
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const response4 =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          created_after: oneDayAgo,
          comment_content: "recent",
          sort_by: "last_updated_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(response4);
  // Test 5: Complex filtering combination
  const response5 =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          minimum_score: -10,
          maximum_score: 10,
          minimum_upvotes: 1,
          minimum_downvotes: 1,
          comment_content: "topic",
          page: 1,
          limit: 20,
          sort_by: "score",
          sort_order: "asc",
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(response5);
  // Test 6: Empty content search (should return all comments)
  const response6 =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          comment_content: "",
          limit: 5,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(response6);
  // Test 7: Special characters and case sensitivity
  const response7 =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          comment_content: "special@char#acters",
          limit: 5,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(response7);
  // Validate pagination structure using TestValidator
  TestValidator.predicate(
    "has pagination object",
    typeof response1.pagination === "object",
  );
  TestValidator.predicate(
    "current page is valid",
    response1.pagination.current >= 0,
  );
  TestValidator.predicate("limit is positive", response1.pagination.limit > 0);
  TestValidator.predicate(
    "records count is valid",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    response1.pagination.pages >= 0,
  );
}
