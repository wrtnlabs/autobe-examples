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
 * Test moderation log temporal data and chronological ordering.
 *
 * This test validates that moderation logs contain accurate temporal data and
 * are properly ordered chronologically. Since the API does not support temporal
 * filtering through query parameters, this test focuses on timestamp accuracy,
 * chronological ordering, and validates that clients can perform temporal
 * filtering on the returned data.
 *
 * Workflow:
 *
 * 1. Create and authenticate moderator account
 * 2. Create member account for content generation
 * 3. Establish community infrastructure
 * 4. Assign moderator to the community
 * 5. Create posts at different time intervals
 * 6. Submit reports across different time periods
 * 7. Perform moderation actions at various timestamps
 * 8. Retrieve all logs and validate temporal data
 * 9. Verify chronological ordering
 * 10. Validate timestamp accuracy and consistency
 */
export async function test_api_community_moderation_log_temporal_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    username: RandomGenerator.name(2).replace(/\s/g, "_").toLowerCase(),
    email: `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account for content creation
  const memberData = {
    username: RandomGenerator.name(2).replace(/\s/g, "_").toLowerCase(),
    email: `member_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Create community for moderation activities
  const communityData = {
    code: `testcom_${RandomGenerator.alphaNumeric(8).toLowerCase()}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "discussion",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Assign moderator to community
  const moderatorAssignment = {
    moderator_id: moderator.id,
    permissions:
      "manage_posts,manage_comments,access_reports,manage_moderators",
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const assignedModerator: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorAssignment,
      },
    );
  typia.assert(assignedModerator);

  // Record timestamp before creating posts
  const testStartTime = new Date();

  // Step 5: Create posts to establish temporal spread
  const posts: IRedditLikePost[] = [];

  for (let i = 0; i < 5; i++) {
    const postData = {
      community_id: community.id,
      type: "text",
      title: `Test Post ${i + 1} - ${RandomGenerator.name(3)}`,
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate;

    const post: IRedditLikePost =
      await api.functional.redditLike.member.posts.create(connection, {
        body: postData,
      });
    typia.assert(post);
    posts.push(post);
  }

  // Step 6: Submit content reports
  const reports: IRedditLikeContentReport[] = [];

  for (let i = 0; i < posts.length; i++) {
    const reportData = {
      reported_post_id: posts[i].id,
      community_id: community.id,
      content_type: "post",
      violation_categories: "spam,harassment",
      additional_context: `Report context for post ${i + 1}`,
    } satisfies IRedditLikeContentReport.ICreate;

    const report: IRedditLikeContentReport =
      await api.functional.redditLike.content_reports.create(connection, {
        body: reportData,
      });
    typia.assert(report);
    reports.push(report);
  }

  // Step 7: Create moderation actions
  const actions: IRedditLikeModerationAction[] = [];

  for (let i = 0; i < reports.length; i++) {
    const actionData = {
      report_id: reports[i].id,
      affected_post_id: posts[i].id,
      community_id: community.id,
      action_type: i % 2 === 0 ? "remove" : "approve",
      content_type: "post",
      removal_type: i % 2 === 0 ? "community" : undefined,
      reason_category: "spam",
      reason_text: `Moderation reason for post ${i + 1}`,
    } satisfies IRedditLikeModerationAction.ICreate;

    const action: IRedditLikeModerationAction =
      await api.functional.redditLike.moderator.moderation.actions.create(
        connection,
        {
          body: actionData,
        },
      );
    typia.assert(action);
    actions.push(action);
  }

  // Record timestamp after all events created
  const testEndTime = new Date();

  // Step 8: Retrieve all moderation logs
  const allLogsRequest = {
    page: 1,
    limit: 50,
    community_id: community.id,
  } satisfies IRedditLikeModerationLog.IRequest;

  const allLogsPage: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.moderator.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: allLogsRequest,
      },
    );
  typia.assert(allLogsPage);

  // Validate response structure
  TestValidator.predicate(
    "logs page should have data array",
    allLogsPage.data !== null && allLogsPage.data !== undefined,
  );

  TestValidator.predicate(
    "logs should have pagination info",
    allLogsPage.pagination !== null && allLogsPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "should have moderation logs in the community",
    allLogsPage.data.length > 0,
  );

  // Step 9: Validate all log entries have proper temporal data
  for (const log of allLogsPage.data) {
    TestValidator.predicate(
      "log entry should have id",
      log.id !== null && log.id !== undefined,
    );

    TestValidator.predicate(
      "log entry should have log_type",
      log.log_type !== null && log.log_type !== undefined,
    );

    TestValidator.predicate(
      "log entry should have action_description",
      log.action_description !== null && log.action_description !== undefined,
    );

    TestValidator.predicate(
      "log entry should have created_at timestamp",
      log.created_at !== null && log.created_at !== undefined,
    );

    // Validate timestamp is valid date-time format
    const logTimestamp = new Date(log.created_at);
    TestValidator.predicate(
      "log created_at should be valid date",
      !isNaN(logTimestamp.getTime()),
    );

    // Validate timestamp is within reasonable test time window
    TestValidator.predicate(
      "log timestamp should be after test start",
      logTimestamp.getTime() >= testStartTime.getTime() - 60000, // 1 minute buffer
    );

    TestValidator.predicate(
      "log timestamp should be before test end",
      logTimestamp.getTime() <= testEndTime.getTime() + 60000, // 1 minute buffer
    );
  }

  // Step 10: Verify chronological ordering (descending - most recent first)
  if (allLogsPage.data.length > 1) {
    for (let i = 0; i < allLogsPage.data.length - 1; i++) {
      const currentLogDate = new Date(allLogsPage.data[i].created_at).getTime();
      const nextLogDate = new Date(
        allLogsPage.data[i + 1].created_at,
      ).getTime();

      TestValidator.predicate(
        "logs should be sorted in descending chronological order",
        currentLogDate >= nextLogDate,
      );
    }
  }

  // Step 11: Test pagination maintains chronological ordering
  const paginatedRequest = {
    page: 1,
    limit: 3,
    community_id: community.id,
  } satisfies IRedditLikeModerationLog.IRequest;

  const paginatedPage: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.moderator.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: paginatedRequest,
      },
    );
  typia.assert(paginatedPage);

  TestValidator.predicate(
    "paginated results should respect limit",
    paginatedPage.data.length <= 3,
  );

  TestValidator.equals(
    "pagination current page should match request",
    paginatedPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match request",
    paginatedPage.pagination.limit,
    3,
  );

  // Verify chronological ordering in paginated results
  if (paginatedPage.data.length > 1) {
    for (let i = 0; i < paginatedPage.data.length - 1; i++) {
      const currentDate = new Date(paginatedPage.data[i].created_at).getTime();
      const nextDate = new Date(paginatedPage.data[i + 1].created_at).getTime();

      TestValidator.predicate(
        "paginated logs should maintain chronological order",
        currentDate >= nextDate,
      );
    }
  }

  // Step 12: Validate log type filtering (if logs exist)
  if (allLogsPage.data.length > 0) {
    const firstLogType = allLogsPage.data[0].log_type;

    const typeFilteredRequest = {
      page: 1,
      limit: 20,
      community_id: community.id,
      log_type: firstLogType,
    } satisfies IRedditLikeModerationLog.IRequest;

    const typeFilteredPage: IPageIRedditLikeModerationLog =
      await api.functional.redditLike.moderator.communities.moderation_log.index(
        connection,
        {
          communityId: community.id,
          body: typeFilteredRequest,
        },
      );
    typia.assert(typeFilteredPage);

    // Verify all returned logs match the filter
    for (const log of typeFilteredPage.data) {
      TestValidator.equals(
        "filtered logs should match requested log type",
        log.log_type,
        firstLogType,
      );
    }
  }

  // Final validation: Ensure moderation log system tracks events
  TestValidator.predicate(
    "moderation log system should track moderation events",
    allLogsPage.pagination.records >= reports.length,
  );
}
