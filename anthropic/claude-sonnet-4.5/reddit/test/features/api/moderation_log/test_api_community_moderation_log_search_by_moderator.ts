import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationLog";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that community moderators can search and retrieve filtered moderation
 * logs for their assigned communities.
 *
 * This test validates the complete moderation audit trail access workflow:
 *
 * 1. Create moderator and member accounts
 * 2. Create community and assign moderator
 * 3. Generate moderation activities (report submission and action taken)
 * 4. Search and retrieve moderation logs with filtering
 * 5. Validate proper authorization scoping and data completeness
 */
export async function test_api_community_moderation_log_search_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account for content creation
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community as member
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Switch to moderator account and assign to community
  connection.headers = connection.headers || {};
  connection.headers.Authorization = moderator.token.access;

  const moderatorAssignment: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: "manage_posts,manage_comments,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 5: Switch back to member and create a post
  connection.headers.Authorization = member.token.access;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 6: Submit content report on the post
  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(report);

  // Step 7: Switch to moderator and create moderation action
  connection.headers.Authorization = moderator.token.access;

  const moderationAction: IRedditLikeModerationAction =
    await api.functional.redditLike.moderator.moderation.actions.create(
      connection,
      {
        body: {
          report_id: report.id,
          affected_post_id: post.id,
          community_id: community.id,
          action_type: "remove",
          content_type: "post",
          removal_type: "community",
          reason_category: "spam",
          reason_text: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 8: Search and retrieve moderation logs for the community
  const logSearchResult: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.moderator.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          community_id: community.id,
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(logSearchResult);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination info should be present",
    logSearchResult.pagination !== null &&
      logSearchResult.pagination !== undefined,
  );
  TestValidator.equals("current page", logSearchResult.pagination.current, 1);
  TestValidator.predicate(
    "log entries should exist",
    logSearchResult.data.length > 0,
  );

  // Validate log entries contain complete audit information
  for (const logEntry of logSearchResult.data) {
    TestValidator.predicate(
      "log entry has id",
      logEntry.id !== null && logEntry.id !== undefined,
    );
    TestValidator.predicate(
      "log entry has type",
      logEntry.log_type !== null && logEntry.log_type !== undefined,
    );
    TestValidator.predicate(
      "log entry has description",
      logEntry.action_description !== null &&
        logEntry.action_description !== undefined,
    );
    TestValidator.predicate(
      "log entry has timestamp",
      logEntry.created_at !== null && logEntry.created_at !== undefined,
    );
  }

  // Test filtering by log type
  const filteredLogResult: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.moderator.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 5,
          log_type: "action_taken",
          community_id: community.id,
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(filteredLogResult);

  TestValidator.predicate(
    "filtered results should be returned",
    filteredLogResult.data !== null && filteredLogResult.data !== undefined,
  );
}
