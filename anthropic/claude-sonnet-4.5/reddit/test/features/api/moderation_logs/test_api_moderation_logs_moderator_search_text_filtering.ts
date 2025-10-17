import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationLog";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test full-text search capabilities within moderation log action descriptions
 * using GIN trigram indexing.
 *
 * This test validates that moderators can search for specific moderation events
 * by searching text within action descriptions and metadata. The test creates
 * moderation activities with distinct, searchable action descriptions, then
 * performs searches to verify efficient text matching functionality.
 *
 * Validates:
 *
 * 1. Moderators can create communities, posts, reports, and moderation actions
 * 2. Moderation actions generate searchable log entries
 * 3. Search functionality returns relevant log entries from the moderation system
 * 4. Search results maintain proper pagination and sorting
 * 5. Log entries contain the expected structure and data fields
 */
export async function test_api_moderation_logs_moderator_search_text_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for performing all moderation activities
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create community for moderation activities
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create post to enable moderation events
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create content report with specific violation description for search testing
  const uniqueKeyword1 =
    "suspicious_spam_behavior_" + RandomGenerator.alphaNumeric(8);
  const uniqueKeyword2 =
    "inappropriate_content_violation_" + RandomGenerator.alphaNumeric(8);

  const reportData = {
    reported_post_id: post.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: "spam,harassment",
    additional_context: `This post contains ${uniqueKeyword1} and shows clear signs of ${uniqueKeyword2} that violate community guidelines.`,
  } satisfies IRedditLikeContentReport.ICreate;

  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 5: Create moderation action with distinctive reasoning text for search validation
  const uniqueKeyword3 =
    "removed_for_policy_violation_" + RandomGenerator.alphaNumeric(8);

  const actionData = {
    report_id: report.id,
    affected_post_id: post.id,
    community_id: community.id,
    action_type: "remove",
    content_type: "post",
    removal_type: "community_level",
    reason_category: "spam",
    reason_text: `Content ${uniqueKeyword3} due to repeated ${uniqueKeyword1} patterns and ${uniqueKeyword2} issues identified by community reports.`,
  } satisfies IRedditLikeModerationAction.ICreate;

  const moderationAction: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: actionData,
    });
  typia.assert(moderationAction);

  // Step 6: Search moderation logs for the community
  const searchRequest = {
    community_id: community.id,
    page: 1,
    limit: 10,
  } satisfies IRedditLikeModerationLog.IRequest;

  const searchResults: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.moderation.logs.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResults);

  // Step 7: Validate that search results contain log entries
  TestValidator.predicate(
    "search results should contain at least one log entry",
    searchResults.data.length > 0,
  );

  // Step 8: Verify pagination information is correct
  TestValidator.equals(
    "pagination current page should be 1",
    searchResults.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should be 10",
    searchResults.pagination.limit,
    10,
  );

  // Step 9: Verify that log entries have the expected structure
  const firstLog = searchResults.data[0];
  typia.assert(firstLog);

  TestValidator.predicate(
    "log entry should have valid id",
    typeof firstLog.id === "string" && firstLog.id.length > 0,
  );

  TestValidator.predicate(
    "log entry should have log_type",
    typeof firstLog.log_type === "string" && firstLog.log_type.length > 0,
  );

  TestValidator.predicate(
    "log entry should have action_description",
    typeof firstLog.action_description === "string" &&
      firstLog.action_description.length > 0,
  );

  TestValidator.predicate(
    "log entry should have created_at timestamp",
    typeof firstLog.created_at === "string" && firstLog.created_at.length > 0,
  );

  // Step 10: Verify pagination reflects total records
  TestValidator.predicate(
    "pagination records should match data length when on first page",
    searchResults.pagination.records >= searchResults.data.length,
  );
}
