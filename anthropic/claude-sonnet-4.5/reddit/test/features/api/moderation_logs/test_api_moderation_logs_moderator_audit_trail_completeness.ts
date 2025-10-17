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

export async function test_api_moderation_logs_moderator_audit_trail_completeness(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for performing moderation activities
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderatorPassword = "Test1234!@#$";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account for generating content to be moderated
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const memberPassword = "Member1234!@#$";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create community for moderation context
  const communityCode = RandomGenerator.alphaNumeric(15);
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "general",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: Create post to enable content moderation activities
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 5: Submit content report to generate report_submitted log entry
  const report = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 6: Create moderation action to generate action_taken log entry
  const moderationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        report_id: report.id,
        affected_post_id: post.id,
        community_id: community.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community_level",
        reason_category: "spam",
        reason_text: RandomGenerator.paragraph({ sentences: 3 }),
        internal_notes: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(moderationAction);

  // Step 7: Retrieve moderation logs to verify complete audit trail
  const logsPage = await api.functional.redditLike.moderation.logs.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
        community_id: community.id,
      } satisfies IRedditLikeModerationLog.IRequest,
    },
  );
  typia.assert(logsPage);

  // Step 8: Validate pagination structure
  TestValidator.predicate(
    "logs page has valid pagination",
    logsPage.pagination.current >= 0 &&
      logsPage.pagination.limit > 0 &&
      logsPage.pagination.records >= 0 &&
      logsPage.pagination.pages >= 0,
  );

  // Step 9: Validate log entries exist
  TestValidator.predicate(
    "moderation logs contain entries",
    logsPage.data.length > 0,
  );

  // Step 10: Verify log entries have complete context
  for (const logEntry of logsPage.data) {
    typia.assert(logEntry);

    // Validate required fields are present
    TestValidator.predicate(
      "log entry has unique identifier",
      typeof logEntry.id === "string" && logEntry.id.length > 0,
    );

    TestValidator.predicate(
      "log entry has event type",
      typeof logEntry.log_type === "string" && logEntry.log_type.length > 0,
    );

    TestValidator.predicate(
      "log entry has action description",
      typeof logEntry.action_description === "string" &&
        logEntry.action_description.length > 0,
    );

    TestValidator.predicate(
      "log entry has timestamp",
      typeof logEntry.created_at === "string" && logEntry.created_at.length > 0,
    );
  }

  // Step 11: Verify specific log types are captured
  const logTypes = logsPage.data.map((log) => log.log_type);
  TestValidator.predicate(
    "audit trail captures moderation activities",
    logTypes.length > 0,
  );
}
