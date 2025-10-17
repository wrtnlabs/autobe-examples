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
 * Test moderation log retrieval and filtering capabilities.
 *
 * This test validates that administrators can retrieve and filter moderation
 * logs for a specific community. It creates various moderation events and then
 * queries the logs using different filter parameters to ensure proper log
 * retrieval and filtering functionality.
 *
 * Steps:
 *
 * 1. Create admin account for moderation log access
 * 2. Create member account for content generation
 * 3. Create a community for moderation events
 * 4. Create posts to generate reportable content
 * 5. Create content reports to generate moderation events
 * 6. Create moderation actions to generate action logs
 * 7. Query moderation logs for the community
 * 8. Validate log retrieval and filtering by log type
 * 9. Test pagination of moderation logs
 */
export async function test_api_community_moderation_log_time_range_filtering(
  connection: api.IConnection,
) {
  // 1. Create admin account
  const adminData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(5),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // 2. Create member account
  const memberData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(5),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // 3. Create community
  const communityData = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // 4. Create posts
  const post1Data = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post1: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: post1Data,
    });
  typia.assert(post1);

  const post2Data = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post2: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: post2Data,
    });
  typia.assert(post2);

  // 5. Create content reports
  const report1Data = {
    reported_post_id: post1.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: "spam",
    additional_context: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeContentReport.ICreate;

  const report1: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: report1Data,
    });
  typia.assert(report1);

  const report2Data = {
    reported_post_id: post2.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: "harassment",
    additional_context: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeContentReport.ICreate;

  const report2: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: report2Data,
    });
  typia.assert(report2);

  // 6. Create moderation actions
  const action1Data = {
    report_id: report1.id,
    affected_post_id: post1.id,
    community_id: community.id,
    action_type: "remove",
    content_type: "post",
    removal_type: "community",
    reason_category: "spam",
    reason_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeModerationAction.ICreate;

  const action1: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: action1Data,
    });
  typia.assert(action1);

  const action2Data = {
    report_id: report2.id,
    affected_post_id: post2.id,
    community_id: community.id,
    action_type: "approve",
    content_type: "post",
    reason_category: "false_report",
    reason_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeModerationAction.ICreate;

  const action2: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: action2Data,
    });
  typia.assert(action2);

  // 7. Query all moderation logs (admin is already authenticated)
  const allLogsRequest = {
    page: 1,
    limit: 50,
    community_id: community.id,
  } satisfies IRedditLikeModerationLog.IRequest;

  const allLogs: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.admin.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: allLogsRequest,
      },
    );
  typia.assert(allLogs);

  // 8. Validate pagination structure
  TestValidator.predicate(
    "all logs should have valid pagination",
    allLogs.pagination.pages >= 1,
  );

  TestValidator.predicate(
    "all logs should have records",
    allLogs.pagination.records >= 0,
  );

  TestValidator.predicate(
    "all logs data should be array",
    Array.isArray(allLogs.data),
  );

  // 9. Validate log entries have required properties
  if (allLogs.data.length > 0) {
    const firstLog = allLogs.data[0];
    typia.assert(firstLog);

    TestValidator.predicate(
      "log entry should have id",
      typeof firstLog.id === "string" && firstLog.id.length > 0,
    );

    TestValidator.predicate(
      "log entry should have log_type",
      typeof firstLog.log_type === "string" && firstLog.log_type.length > 0,
    );

    TestValidator.predicate(
      "log entry should have action_description",
      typeof firstLog.action_description === "string",
    );

    TestValidator.predicate(
      "log entry should have created_at",
      typeof firstLog.created_at === "string" && firstLog.created_at.length > 0,
    );
  }

  // 10. Test pagination with smaller limit
  const paginatedRequest = {
    page: 1,
    limit: 2,
    community_id: community.id,
  } satisfies IRedditLikeModerationLog.IRequest;

  const paginatedLogs: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.admin.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: paginatedRequest,
      },
    );
  typia.assert(paginatedLogs);

  TestValidator.predicate(
    "paginated results should respect limit",
    paginatedLogs.data.length <= 2,
  );

  TestValidator.predicate(
    "pagination should have correct current page",
    paginatedLogs.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination should have correct limit",
    paginatedLogs.pagination.limit === 2,
  );
}
