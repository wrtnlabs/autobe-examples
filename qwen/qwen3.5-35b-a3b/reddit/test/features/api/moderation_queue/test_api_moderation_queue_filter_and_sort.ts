import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import type { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IResolutionRatePoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IResolutionRatePoint";
import type { ISLABreach } from "@ORGANIZATION/PROJECT-api/lib/structures/ISLABreach";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_moderation_queue_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create moderator member account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  const moderatorId = moderatorAuth.user.id;
  const moderatorPassword = "1234";
  // 2. Setup: Create reporter A account
  const reporterAConnection: api.IConnection = { host: connection.host };
  const reporterAAuth = await authorize_member_join(reporterAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(reporterAAuth);
  const reporterAId = reporterAAuth.user.id;
  const reporterAPassword = "1234";
  // 3. Setup: Create reporter B account
  const reporterBConnection: api.IConnection = { host: connection.host };
  const reporterBAuth = await authorize_member_join(reporterBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(reporterBAuth);
  const reporterBId = reporterBAuth.user.id;
  const reporterBPassword = "1234";
  // 4. Setup: Create a community owned by moderator
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        },
      },
    );
  typia.assert(community);
  // 5. Setup: Assign moderator role to moderator member
  const moderatorAssignment =
    await generate_random_reddit_platform_member_communities_moderators_create(
      moderatorConnection,
      {
        body: {
          user_id: moderatorId,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 6. Data Generation: Reporter A submits 3 reports
  const reporterAReport1 =
    await generate_random_reddit_platform_member_reports_create(
      reporterAConnection,
      {
        body: {
          community_id: community.id,
          reported_content_type: "POST",
          reported_content_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Short reason",
        },
      },
    );
  typia.assert(reporterAReport1);
  const reporterAReport2 =
    await generate_random_reddit_platform_member_reports_create(
      reporterAConnection,
      {
        body: {
          community_id: community.id,
          reported_content_type: "COMMENT",
          reported_content_id: typia.random<string & tags.Format<"uuid">>(),
          reason:
            "This is a much longer reason with more text to test sorting by reason length functionality in the moderation queue",
        },
      },
    );
  typia.assert(reporterAReport2);
  const reporterAReport3 =
    await generate_random_reddit_platform_member_reports_create(
      reporterAConnection,
      {
        body: {
          community_id: community.id,
          reported_content_type: "POST",
          reported_content_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Medium length reason here",
        },
      },
    );
  typia.assert(reporterAReport3);
  // 7. Data Generation: Reporter B submits 2 reports
  const reporterBReport1 =
    await generate_random_reddit_platform_member_reports_create(
      reporterBConnection,
      {
        body: {
          community_id: community.id,
          reported_content_type: "POST",
          reported_content_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Very short",
        },
      },
    );
  typia.assert(reporterBReport1);
  const reporterBReport2 =
    await generate_random_reddit_platform_member_reports_create(
      reporterBConnection,
      {
        body: {
          community_id: community.id,
          reported_content_type: "COMMENT",
          reported_content_id: typia.random<string & tags.Format<"uuid">>(),
          reason:
            "Another extended reason that provides substantial detail about why the reported content should be reviewed by moderators for potential violation of community guidelines",
        },
      },
    );
  typia.assert(reporterBReport2);
  // 8. Authenticate as moderator for queue access
  const queueConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(queueConnection, {
    body: {
      email: moderatorAuth.user.username,
      password: moderatorPassword,
    },
  });
  // 9. Execute: Filter by reporter_id (reporter A only)
  const reporterAFiltered =
    await api.functional.redditPlatform.member.communities.moderation.queue.index(
      queueConnection,
      {
        communityId: community.id,
        body: {
          reporter_id: reporterAId,
        },
      },
    );
  typia.assert(reporterAFiltered);
  // Validate: Verify only reports from reporter A are returned
  TestValidator.equals(
    "reporter A filter: only A's reports",
    reporterAFiltered.data.every((r) => r.reporter.id === reporterAId),
    true,
  );
  TestValidator.equals(
    "reporter A filter: correct count",
    reporterAFiltered.data.length,
    3,
  );
  // 10. Execute: Filter by reported_content_type (POST only)
  const postFiltered =
    await api.functional.redditPlatform.member.communities.moderation.queue.index(
      queueConnection,
      {
        communityId: community.id,
        body: {
          reported_content_type: "POST",
        },
      },
    );
  typia.assert(postFiltered);
  // Validate: Verify only reports for posts are returned
  TestValidator.equals(
    "POST filter: only POST reports",
    postFiltered.data.every((r) => r.reported_content_type === "POST"),
    true,
  );
  TestValidator.equals(
    "POST filter: correct count (reporter A has 2 POSTs + reporter B has 1 POST)",
    postFiltered.data.length,
    3,
  );
  // 11. Execute: Filter by date range
  // Get reports and filter by their created_at dates
  const allReports =
    await api.functional.redditPlatform.member.communities.moderation.queue.index(
      queueConnection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(allReports);
  // Sort reports by created_at to get min/max
  const sortedReports = allReports.data.toSorted(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const dateMin = sortedReports[0].created_at;
  const dateMax = sortedReports[sortedReports.length - 1].created_at;
  const dateFiltered =
    await api.functional.redditPlatform.member.communities.moderation.queue.index(
      queueConnection,
      {
        communityId: community.id,
        body: {
          created_at_min: dateMin,
          created_at_max: dateMax,
        },
      },
    );
  typia.assert(dateFiltered);
  // Validate: Verify all reports are within date range
  TestValidator.equals(
    "date filter: all reports in range",
    dateFiltered.data.every(
      (r) => r.created_at >= dateMin && r.created_at <= dateMax,
    ),
    true,
  );
  TestValidator.equals(
    "date filter: all 5 reports within range",
    dateFiltered.data.length,
    5,
  );
  // 12. Execute: Sort by reason_length
  const reasonSorted =
    await api.functional.redditPlatform.member.communities.moderation.queue.index(
      queueConnection,
      {
        communityId: community.id,
        body: {
          sort: "reason_length",
        },
      },
    );
  typia.assert(reasonSorted);
  // Validate: Verify reports are sorted by reason length (shortest first)
  const reasonLengths = reasonSorted.data.map((r) => r.reason.length);
  TestValidator.equals(
    "reason_length sort: correctly sorted ascending",
    reasonLengths.every(
      (len, idx) => idx === 0 || len >= reasonLengths[idx - 1],
    ),
    true,
  );
  // 13. Execute: Sort by reporter_history
  const reporterHistorySorted =
    await api.functional.redditPlatform.member.communities.moderation.queue.index(
      queueConnection,
      {
        communityId: community.id,
        body: {
          sort: "reporter_history",
        },
      },
    );
  typia.assert(reporterHistorySorted);
  // Validate: Verify reports are sorted by reporter's report count
  // Reporter A has 3 reports total, Reporter B has 2 reports total
  // Reports from reporter A should appear first (higher report count)
  const reporterIds = reporterHistorySorted.data.map((r) => r.reporter.id);
  TestValidator.equals(
    "reporter_history sort: reporter A (3 reports) first",
    reporterIds[0],
    reporterAId,
  );
  TestValidator.equals(
    "reporter_history sort: reporter B (2 reports) appears later",
    reporterIds.includes(reporterBId),
    true,
  );
  // 14. Execute: Combined filters (reporter_id + content_type + sorting)
  const combinedFiltered =
    await api.functional.redditPlatform.member.communities.moderation.queue.index(
      queueConnection,
      {
        communityId: community.id,
        body: {
          reporter_id: reporterAId,
          reported_content_type: "POST",
          sort: "reason_length",
        },
      },
    );
  typia.assert(combinedFiltered);
  // Validate: Combined filters work correctly
  TestValidator.equals(
    "combined filters: correct reporter",
    combinedFiltered.data.every((r) => r.reporter.id === reporterAId),
    true,
  );
  TestValidator.equals(
    "combined filters: correct content type",
    combinedFiltered.data.every((r) => r.reported_content_type === "POST"),
    true,
  );
  TestValidator.equals(
    "combined filters: correct count (reporter A has 2 POST reports)",
    combinedFiltered.data.length,
    2,
  );
  // 15. Validate: Pagination works correctly with filtered results
  const paginationTest =
    await api.functional.redditPlatform.member.communities.moderation.queue.index(
      queueConnection,
      {
        communityId: community.id,
        body: {
          reporter_id: reporterAId,
          limit: 2,
          page: 1,
        },
      },
    );
  typia.assert(paginationTest);
  // Validate: Pagination metadata accurate
  TestValidator.equals(
    "pagination: current page is 1",
    paginationTest.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: limit is 2",
    paginationTest.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination: records matches total",
    paginationTest.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination: pages calculated correctly (ceil(3/2) = 2)",
    paginationTest.pagination.pages,
    2,
  );
  TestValidator.equals(
    "pagination: data length matches limit",
    paginationTest.data.length,
    2,
  );
  // 16. Validate: Second page of pagination
  const page2Result =
    await api.functional.redditPlatform.member.communities.moderation.queue.index(
      queueConnection,
      {
        communityId: community.id,
        body: {
          reporter_id: reporterAId,
          limit: 2,
          page: 2,
        },
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "pagination page 2: current page is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination page 2: only 1 record on final page",
    page2Result.data.length,
    1,
  );
}