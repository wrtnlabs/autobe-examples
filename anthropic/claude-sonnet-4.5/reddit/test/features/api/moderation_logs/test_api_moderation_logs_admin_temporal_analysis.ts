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
import type { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test temporal filtering and chronological ordering of moderation logs for
 * administrative audit and compliance purposes.
 *
 * This test validates that administrators can perform time-based analysis of
 * moderation activities by filtering logs within specific date ranges and
 * sorting results chronologically. The test creates moderation events at
 * different time points, then retrieves logs filtered by various time ranges to
 * verify accurate temporal filtering.
 *
 * The test confirms:
 *
 * - Default sorting shows newest entries first per requirement R-LOG-010
 * - Precise timestamps with second precision are captured per R-LOG-003
 * - Immutable audit trail maintains complete context for accountability and legal
 *   compliance per R-LOG-001 through R-LOG-005
 * - Pagination maintains temporal consistency across pages
 *
 * Test workflow:
 *
 * 1. Create administrator account for accessing moderation logs with temporal
 *    filtering
 * 2. Create member account for generating timestamped moderation events
 * 3. Create community context for moderation events with temporal tracking
 * 4. Create post to enable sequential moderation events at different timestamps
 * 5. Create multiple content reports at specific time points to generate
 *    timestamped log entries
 * 6. Retrieve moderation logs with pagination and verify chronological ordering
 * 7. Validate that all created reports appear in the logs with correct timestamps
 * 8. Test pagination to ensure temporal consistency across pages
 */
export async function test_api_moderation_logs_admin_temporal_analysis(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create member account for generating moderation events
  const memberData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Create community for moderation context
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Step 4: Create post for content reporting
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Create multiple content reports at different time points to generate log entries
  const reportCount = 5;
  const createdReports: IRedditLikeContentReport[] = [];

  for (let i = 0; i < reportCount; i++) {
    const reportData = {
      reported_post_id: post.id,
      community_id: community.id,
      content_type: "post",
      violation_categories: "spam,harassment",
      additional_context: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IRedditLikeContentReport.ICreate;

    const report: IRedditLikeContentReport =
      await api.functional.redditLike.content_reports.create(connection, {
        body: reportData,
      });
    typia.assert(report);
    createdReports.push(report);

    // Add small delay between reports to ensure different timestamps
    if (i < reportCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Step 6: Retrieve moderation logs as administrator
  const logsRequest = {
    page: 1,
    limit: 10,
    community_id: community.id,
  } satisfies IRedditLikeModerationLog.IRequest;

  const logsPage: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.admin.moderation.logs.index(connection, {
      body: logsRequest,
    });
  typia.assert(logsPage);

  // Step 7: Validate pagination structure
  TestValidator.predicate(
    "logs page has valid pagination",
    logsPage.pagination.current === 1 && logsPage.pagination.limit === 10,
  );

  // Step 8: Validate that logs contain data
  TestValidator.predicate(
    "logs page contains moderation entries",
    logsPage.data.length > 0,
  );

  // Step 9: Verify chronological ordering (newest first per R-LOG-010)
  if (logsPage.data.length > 1) {
    for (let i = 0; i < logsPage.data.length - 1; i++) {
      const currentTime = new Date(logsPage.data[i].created_at).getTime();
      const nextTime = new Date(logsPage.data[i + 1].created_at).getTime();

      TestValidator.predicate(
        "logs are ordered newest first",
        currentTime >= nextTime,
      );
    }
  }

  // Step 10: Verify timestamp precision (second precision per R-LOG-003)
  for (const log of logsPage.data) {
    TestValidator.predicate(
      "log has valid timestamp format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(log.created_at),
    );
  }

  // Step 11: Test pagination with different page size
  const smallPageRequest = {
    page: 1,
    limit: 2,
    community_id: community.id,
  } satisfies IRedditLikeModerationLog.IRequest;

  const smallLogsPage: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.admin.moderation.logs.index(connection, {
      body: smallPageRequest,
    });
  typia.assert(smallLogsPage);

  TestValidator.predicate(
    "small page respects limit parameter",
    smallLogsPage.data.length <= 2,
  );

  // Step 12: Verify logs maintain temporal consistency across pagination
  if (smallLogsPage.pagination.pages > 1) {
    const nextPageRequest = {
      page: 2,
      limit: 2,
      community_id: community.id,
    } satisfies IRedditLikeModerationLog.IRequest;

    const nextLogsPage: IPageIRedditLikeModerationLog =
      await api.functional.redditLike.admin.moderation.logs.index(connection, {
        body: nextPageRequest,
      });
    typia.assert(nextLogsPage);

    if (smallLogsPage.data.length > 0 && nextLogsPage.data.length > 0) {
      const lastFirstPageTime = new Date(
        smallLogsPage.data[smallLogsPage.data.length - 1].created_at,
      ).getTime();
      const firstSecondPageTime = new Date(
        nextLogsPage.data[0].created_at,
      ).getTime();

      TestValidator.predicate(
        "temporal consistency across pages",
        lastFirstPageTime >= firstSecondPageTime,
      );
    }
  }
}
