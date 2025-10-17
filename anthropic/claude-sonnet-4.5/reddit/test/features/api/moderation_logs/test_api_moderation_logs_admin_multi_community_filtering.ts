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
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test administrator's ability to filter moderation logs across multiple
 * communities and log types.
 *
 * This test validates platform-wide visibility granted to administrators per
 * requirement R-LOG-009, testing that administrators can filter logs by
 * community context, actor roles, and log types. The test creates multiple
 * communities with different moderation activities, generates various types of
 * moderation events across these communities, and verifies that administrators
 * can search and filter logs to find specific moderation patterns.
 *
 * Test workflow:
 *
 * 1. Create administrator account for platform-wide log access
 * 2. Create member account for generating moderation events
 * 3. Create first community with moderation activities
 * 4. Generate report_submitted log entries via content reports
 * 5. Create moderator account for moderator-specific actions
 * 6. Generate action_taken log entries via moderation actions
 * 7. Create second community for multi-community filtering
 * 8. Generate additional moderation events in second community
 * 9. Test filtering by log_type
 * 10. Test filtering by community_id
 * 11. Test combined filtering (log_type + community_id)
 * 12. Verify pagination functionality
 */
export async function test_api_moderation_logs_admin_multi_community_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for platform-wide moderation log access
  const adminData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create member account for multi-community moderation event generation
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Create first test community for generating distinct moderation activities
  const community1Data = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 10,
      wordMax: 15,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community1: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: community1Data,
    });
  typia.assert(community1);

  // Step 4: Create post in first community to enable content-based moderation events
  const post1Data = {
    community_id: community1.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post1: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: post1Data,
    });
  typia.assert(post1);

  // Step 5: Create content report to generate report_submitted log entries
  const report1Data = {
    reported_post_id: post1.id,
    community_id: community1.id,
    content_type: "post",
    violation_categories: "spam,harassment",
  } satisfies IRedditLikeContentReport.ICreate;

  const report1: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: report1Data,
    });
  typia.assert(report1);

  // Step 6: Create moderator account for generating moderator-specific log entries
  const moderatorData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 7: Create moderation action to generate action_taken log entries for multi-type filtering
  const action1Data = {
    report_id: report1.id,
    affected_post_id: post1.id,
    community_id: community1.id,
    action_type: "remove",
    content_type: "post",
    reason_category: "spam",
    reason_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeModerationAction.ICreate;

  const action1: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: action1Data,
    });
  typia.assert(action1);

  // Switch to member account for creating second community
  await api.functional.auth.member.join(connection, {
    body: memberData,
  });

  // Step 8: Create second community for multi-community filtering tests
  const community2Data = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 10,
      wordMax: 15,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community2: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: community2Data,
    });
  typia.assert(community2);

  // Create post in second community
  const post2Data = {
    community_id: community2.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post2: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: post2Data,
    });
  typia.assert(post2);

  // Create report in second community
  const report2Data = {
    reported_post_id: post2.id,
    community_id: community2.id,
    content_type: "post",
    violation_categories: "hate_speech",
  } satisfies IRedditLikeContentReport.ICreate;

  const report2: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: report2Data,
    });
  typia.assert(report2);

  // Switch to moderator account for second action
  await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });

  // Create moderation action in second community
  const action2Data = {
    report_id: report2.id,
    affected_post_id: post2.id,
    community_id: community2.id,
    action_type: "approve",
    content_type: "post",
    reason_category: "reviewed",
    reason_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeModerationAction.ICreate;

  const action2: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: action2Data,
    });
  typia.assert(action2);

  // Switch to admin account for log retrieval tests
  await api.functional.auth.admin.join(connection, {
    body: adminData,
  });

  // Step 9: Test retrieving all moderation logs without filters
  const allLogsRequest = {} satisfies IRedditLikeModerationLog.IRequest;

  const allLogs: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.admin.moderation.logs.index(connection, {
      body: allLogsRequest,
    });
  typia.assert(allLogs);
  TestValidator.predicate(
    "all logs should contain entries",
    allLogs.data.length > 0,
  );

  // Step 10: Test filtering by log_type for report_submitted entries
  const reportLogsRequest = {
    log_type: "report_submitted",
  } satisfies IRedditLikeModerationLog.IRequest;

  const reportLogs: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.admin.moderation.logs.index(connection, {
      body: reportLogsRequest,
    });
  typia.assert(reportLogs);
  TestValidator.predicate(
    "report logs should be filtered",
    reportLogs.data.length > 0,
  );

  // Step 11: Test filtering by log_type for action_taken entries
  const actionLogsRequest = {
    log_type: "action_taken",
  } satisfies IRedditLikeModerationLog.IRequest;

  const actionLogs: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.admin.moderation.logs.index(connection, {
      body: actionLogsRequest,
    });
  typia.assert(actionLogs);
  TestValidator.predicate(
    "action logs should be filtered",
    actionLogs.data.length > 0,
  );

  // Step 12: Test filtering by community_id for first community
  const community1LogsRequest = {
    community_id: community1.id,
  } satisfies IRedditLikeModerationLog.IRequest;

  const community1Logs: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.admin.moderation.logs.index(connection, {
      body: community1LogsRequest,
    });
  typia.assert(community1Logs);
  TestValidator.predicate(
    "community1 logs should be filtered",
    community1Logs.data.length > 0,
  );

  // Step 13: Test filtering by community_id for second community
  const community2LogsRequest = {
    community_id: community2.id,
  } satisfies IRedditLikeModerationLog.IRequest;

  const community2Logs: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.admin.moderation.logs.index(connection, {
      body: community2LogsRequest,
    });
  typia.assert(community2Logs);
  TestValidator.predicate(
    "community2 logs should be filtered",
    community2Logs.data.length > 0,
  );

  // Step 14: Test combined filtering (log_type + community_id)
  const combinedRequest = {
    log_type: "action_taken",
    community_id: community1.id,
  } satisfies IRedditLikeModerationLog.IRequest;

  const combinedLogs: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.admin.moderation.logs.index(connection, {
      body: combinedRequest,
    });
  typia.assert(combinedLogs);

  // Step 15: Test pagination with page and limit parameters
  const paginatedRequest = {
    page: 1,
    limit: 5,
  } satisfies IRedditLikeModerationLog.IRequest;

  const paginatedLogs: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.admin.moderation.logs.index(connection, {
      body: paginatedRequest,
    });
  typia.assert(paginatedLogs);
  TestValidator.predicate(
    "pagination should respect limit",
    paginatedLogs.data.length <= 5,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedLogs.pagination.current,
    1,
  );
}
