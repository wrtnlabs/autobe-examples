import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationLog";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test moderation log filtering by log type for efficient navigation of
 * moderation history.
 *
 * This test validates that the moderation log filtering system correctly
 * isolates specific log types (report_submitted, action_taken) enabling
 * moderators to efficiently navigate large moderation histories. The test
 * creates multiple moderation events of different types and verifies that
 * filtering returns only matching log entries.
 *
 * Test workflow:
 *
 * 1. Create admin account for moderation privileges
 * 2. Create member account to generate reportable content
 * 3. Create community context for moderation logs
 * 4. Create multiple posts for reporting
 * 5. Submit content reports (generates report_submitted logs)
 * 6. Take moderation actions (generates action_taken logs)
 * 7. Filter logs by "report_submitted" type and verify results
 * 8. Filter logs by "action_taken" type and verify results
 * 9. Retrieve unfiltered logs to verify all event types exist
 */
export async function test_api_community_moderation_log_filtering_by_log_type(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for moderation actions
  const adminData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create member account to generate content
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 3: Create community context
  const communityData = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "general",
  } satisfies IRedditLikeCommunity.ICreate;

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: communityData,
    },
  );
  typia.assert(community);

  // Step 4: Create multiple posts for reporting
  const posts = await ArrayUtil.asyncRepeat(3, async (index) => {
    const postData = {
      community_id: community.id,
      type: "text",
      title: `Test Post ${index + 1} - ${RandomGenerator.name(3)}`,
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate;

    const post = await api.functional.redditLike.member.posts.create(
      connection,
      {
        body: postData,
      },
    );
    typia.assert(post);
    return post;
  });

  // Step 5: Submit content reports to generate report_submitted log entries
  const reports = await ArrayUtil.asyncRepeat(posts.length, async (index) => {
    const reportData = {
      reported_post_id: posts[index].id,
      community_id: community.id,
      content_type: "post",
      violation_categories: "spam,harassment",
      additional_context: `Report for post ${index + 1} - inappropriate content`,
    } satisfies IRedditLikeContentReport.ICreate;

    const report = await api.functional.redditLike.content_reports.create(
      connection,
      {
        body: reportData,
      },
    );
    typia.assert(report);
    return report;
  });

  // Step 6: Take moderation actions to generate action_taken log entries
  const actions = await ArrayUtil.asyncRepeat(reports.length, async (index) => {
    const actionData = {
      report_id: reports[index].id,
      affected_post_id: posts[index].id,
      community_id: community.id,
      action_type: "remove",
      content_type: "post",
      removal_type: "community",
      reason_category: "spam",
      reason_text: `Removing post ${index + 1} for spam violation`,
    } satisfies IRedditLikeModerationAction.ICreate;

    const action =
      await api.functional.redditLike.admin.moderation.actions.create(
        connection,
        {
          body: actionData,
        },
      );
    typia.assert(action);
    return action;
  });

  // Step 7: Filter logs by "report_submitted" type
  const reportLogsRequest = {
    page: 1,
    limit: 50,
    log_type: "report_submitted",
    community_id: community.id,
  } satisfies IRedditLikeModerationLog.IRequest;

  const reportLogs =
    await api.functional.redditLike.admin.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: reportLogsRequest,
      },
    );
  typia.assert(reportLogs);

  TestValidator.predicate(
    "report logs should contain data",
    reportLogs.data.length > 0,
  );

  // Verify all returned logs are report_submitted type
  for (const log of reportLogs.data) {
    TestValidator.predicate(
      "filtered logs should only contain report_submitted type",
      log.log_type === "report_submitted",
    );
  }

  // Step 8: Filter logs by "action_taken" type
  const actionLogsRequest = {
    page: 1,
    limit: 50,
    log_type: "action_taken",
    community_id: community.id,
  } satisfies IRedditLikeModerationLog.IRequest;

  const actionLogs =
    await api.functional.redditLike.admin.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: actionLogsRequest,
      },
    );
  typia.assert(actionLogs);

  TestValidator.predicate(
    "action logs should contain data",
    actionLogs.data.length > 0,
  );

  // Verify all returned logs are action_taken type
  for (const log of actionLogs.data) {
    TestValidator.predicate(
      "filtered logs should only contain action_taken type",
      log.log_type === "action_taken",
    );
  }

  // Step 9: Retrieve unfiltered logs to verify both types exist
  const allLogsRequest = {
    page: 1,
    limit: 100,
    community_id: community.id,
  } satisfies IRedditLikeModerationLog.IRequest;

  const allLogs =
    await api.functional.redditLike.admin.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: allLogsRequest,
      },
    );
  typia.assert(allLogs);

  TestValidator.predicate(
    "unfiltered logs should contain more entries than filtered logs",
    allLogs.data.length >= reportLogs.data.length + actionLogs.data.length,
  );

  // Verify both log types exist in unfiltered results
  const hasReportLogs = allLogs.data.some(
    (log) => log.log_type === "report_submitted",
  );
  const hasActionLogs = allLogs.data.some(
    (log) => log.log_type === "action_taken",
  );

  TestValidator.predicate(
    "unfiltered logs should contain report_submitted type",
    hasReportLogs,
  );

  TestValidator.predicate(
    "unfiltered logs should contain action_taken type",
    hasActionLogs,
  );

  TestValidator.predicate(
    "filtering correctly isolates specific log types",
    reportLogs.data.length < allLogs.data.length &&
      actionLogs.data.length < allLogs.data.length,
  );
}
