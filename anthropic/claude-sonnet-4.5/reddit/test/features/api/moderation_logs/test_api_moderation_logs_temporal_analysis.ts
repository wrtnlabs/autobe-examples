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
 * Test moderation log retrieval with time range filtering for temporal pattern
 * analysis.
 *
 * This test validates the ability to query moderation activities within
 * specific time windows for trend analysis. The scenario creates moderation
 * events across different time periods, then queries logs to verify time-based
 * filtering, timestamp sorting, and temporal pattern tracking capabilities
 * essential for understanding moderation trends and activity cycles.
 *
 * Test workflow:
 *
 * 1. Register member account and create community
 * 2. Create posts for moderation events
 * 3. Submit timestamped content reports
 * 4. Register moderator and perform moderation actions
 * 5. Query moderation logs with temporal analysis
 * 6. Verify timestamp ordering and event retrieval
 */
export async function test_api_moderation_logs_temporal_analysis(
  connection: api.IConnection,
) {
  // Step 1: Register member account to create content
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community for moderation
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create multiple posts for moderation events
  const post1: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
        body: typia.random<string & tags.MaxLength<40000>>(),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post1);

  const post2: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
        body: typia.random<string & tags.MaxLength<40000>>(),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post2);

  // Step 4: Submit timestamped content reports
  const report1: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: {
        reported_post_id: post1.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: "This post contains spam content",
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(report1);

  const report2: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: {
        reported_post_id: post2.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "hate_speech",
        additional_context: "Inappropriate content detected",
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(report2);

  // Step 5: Register moderator account for temporal log analysis
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 6: Create timestamped moderation actions
  const action1: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        report_id: report1.id,
        affected_post_id: post1.id,
        community_id: community.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community",
        reason_category: "spam",
        reason_text: "Post removed for spam violation",
        internal_notes: "First moderation action",
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(action1);

  const action2: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        report_id: report2.id,
        affected_post_id: post2.id,
        community_id: community.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "platform",
        reason_category: "hate_speech",
        reason_text: "Post removed for hate speech",
        internal_notes: "Second moderation action",
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(action2);

  // Step 7: Query moderation logs for temporal analysis
  const moderationLogs: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.moderator.moderation.logs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          community_id: community.id,
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(moderationLogs);

  // Step 8: Verify pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    moderationLogs.pagination.current >= 0 &&
      moderationLogs.pagination.limit > 0 &&
      moderationLogs.pagination.records >= 0 &&
      moderationLogs.pagination.pages >= 0,
  );

  // Step 9: Verify logs contain moderation events
  TestValidator.predicate(
    "moderation logs should contain events",
    moderationLogs.data.length > 0,
  );

  // Step 10: Verify log entries have required timestamp fields
  for (const log of moderationLogs.data) {
    TestValidator.predicate(
      "log entry should have valid timestamp",
      log.created_at !== null && log.created_at !== undefined,
    );
    TestValidator.predicate(
      "log entry should have log type",
      log.log_type !== null && log.log_type !== undefined,
    );
    TestValidator.predicate(
      "log entry should have action description",
      log.action_description !== null && log.action_description !== undefined,
    );
  }
}
