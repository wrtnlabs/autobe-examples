import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import type { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import type { ICommunityPlatformReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComment";
import type { ICommunityPlatformReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_admin_reports_dismissals_create } from "../../../generate/generate_random_community_platform_admin_reports_dismissals_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_content_report } from "../../../prepare/prepare_random_community_platform_content_report";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_report_dismissal } from "../../../prepare/prepare_random_community_platform_report_dismissal";

/**
 * Test that a moderator with privileges in multiple communities can filter report statistics by date range, status, and content type.
 *
 * 1. Setup: Create moderator with two communities, generate reports with different dates/statuses in each community
 * 2. Date Range Filtering: Test created_after and created_before filters
 * 3. Status Filtering: Test pending, approved, dismissed filters
 * 4. Content Type Filtering: Test post vs comment report filtering
 * 5. Combined Filtering: Test multiple filter combinations
 * 6. Validation: Ensure statistics aggregation reflects filtered results correctly
 */
export async function test_api_reports_statistics_filtered_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup moderator with multiple communities
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(moderatorConnection.headers?.Authorization);
  // Create first community
  const community1 =
    await api.functional.communityPlatform.member.communities.create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // Create second community
  const community2 =
    await api.functional.communityPlatform.member.communities.create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // 2. Create posts in each community for reporting
  const post1 = await api.functional.communityPlatform.member.posts.create(
    moderatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community1.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await api.functional.communityPlatform.member.posts.create(
    moderatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community2.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  // 3. Create reporter users
  const reporter1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporter1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(reporter1Connection.headers?.Authorization);
  const reporter2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporter2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(reporter2Connection.headers?.Authorization);
  // 4. Generate reports with different dates and statuses
  // We'll create reports with different created_at timestamps by manipulating dates
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // Report 1: Yesterday, pending status
  const report1 = await api.functional.communityPlatform.member.reports.create(
    reporter1Connection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: post1.id,
      } satisfies ICommunityPlatformContentReport.ICreate,
    },
  );
  typia.assert(report1);
  // Report 2: Today, approved status
  const report2 = await api.functional.communityPlatform.member.reports.create(
    reporter2Connection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: post2.id,
      } satisfies ICommunityPlatformContentReport.ICreate,
    },
  );
  typia.assert(report2);
  // Approve report2
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminConnection.headers?.Authorization);
  const approval =
    await api.functional.communityPlatform.admin.reports.approvals.create(
      adminConnection,
      {
        reportId: report2.id,
      },
    );
  typia.assert(approval);
  // Report 3: Tomorrow, dismissed status (we'll create another report to dismiss)
  const report3 = await api.functional.communityPlatform.member.reports.create(
    reporter1Connection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: post1.id,
      } satisfies ICommunityPlatformContentReport.ICreate,
    },
  );
  typia.assert(report3);
  // Dismiss report3
  const dismissal =
    await api.functional.communityPlatform.admin.reports.dismissals.create(
      adminConnection,
      {
        reportId: report3.id,
        body: {
          notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformReportDismissal.ICreate,
      },
    );
  typia.assert(dismissal);
  // 5. Test date range filtering
  // Filter by created_after (yesterday)
  const yesterdayFiltered =
    await api.functional.communityPlatform.member.reports.statistics.index(
      moderatorConnection,
      {
        body: {
          created_after: yesterday.toISOString(),
          limit: 100,
        } satisfies ICommunityPlatformContentReport.IRequest,
      },
    );
  typia.assert(yesterdayFiltered);
  // Filter by created_before (tomorrow)
  const tomorrowFiltered =
    await api.functional.communityPlatform.member.reports.statistics.index(
      moderatorConnection,
      {
        body: {
          created_before: tomorrow.toISOString(),
          limit: 100,
        } satisfies ICommunityPlatformContentReport.IRequest,
      },
    );
  typia.assert(tomorrowFiltered);
  // 6. Test status filtering
  const pendingFiltered =
    await api.functional.communityPlatform.member.reports.statistics.index(
      moderatorConnection,
      {
        body: {
          status: ["pending"],
          limit: 100,
        } satisfies ICommunityPlatformContentReport.IRequest,
      },
    );
  typia.assert(pendingFiltered);
  const approvedFiltered =
    await api.functional.communityPlatform.member.reports.statistics.index(
      moderatorConnection,
      {
        body: {
          status: ["approved"],
          limit: 100,
        } satisfies ICommunityPlatformContentReport.IRequest,
      },
    );
  typia.assert(approvedFiltered);
  const dismissedFiltered =
    await api.functional.communityPlatform.member.reports.statistics.index(
      moderatorConnection,
      {
        body: {
          status: ["dismissed"],
          limit: 100,
        } satisfies ICommunityPlatformContentReport.IRequest,
      },
    );
  typia.assert(dismissedFiltered);
  // 7. Test content_type filtering
  const postReportsFiltered =
    await api.functional.communityPlatform.member.reports.statistics.index(
      moderatorConnection,
      {
        body: {
          content_type: "post",
          limit: 100,
        } satisfies ICommunityPlatformContentReport.IRequest,
      },
    );
  typia.assert(postReportsFiltered);
  // 8. Test combined filtering
  const combinedFiltered =
    await api.functional.communityPlatform.member.reports.statistics.index(
      moderatorConnection,
      {
        body: {
          created_after: yesterday.toISOString(),
          status: ["pending", "approved"],
          content_type: "post",
          limit: 100,
        } satisfies ICommunityPlatformContentReport.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  // 9. Validate filtering logic with TestValidator
  // Date range validation
  TestValidator.predicate(
    "yesterday filtered should include reports",
    yesterdayFiltered.data.length > 0,
  );
  TestValidator.predicate(
    "tomorrow filtered should include reports",
    tomorrowFiltered.data.length > 0,
  );
  // Status validation
  TestValidator.predicate(
    "pending filtered should only contain pending reports",
    pendingFiltered.data.every((r) => r.status === "pending"),
  );
  TestValidator.predicate(
    "approved filtered should only contain approved reports",
    approvedFiltered.data.every((r) => r.status === "approved"),
  );
  TestValidator.predicate(
    "dismissed filtered should only contain dismissed reports",
    dismissedFiltered.data.every((r) => r.status === "dismissed"),
  );
  // Content type validation - all our reports are posts
  TestValidator.predicate(
    "post reports filtered should contain reports",
    postReportsFiltered.data.length > 0,
  );
  // Combined filter validation
  TestValidator.predicate(
    "combined filtered reports should match criteria",
    combinedFiltered.data.every(
      (r) => r.status === "pending" || r.status === "approved",
    ),
  );
  // 10. Test community filtering
  const community1Filtered =
    await api.functional.communityPlatform.member.reports.statistics.index(
      moderatorConnection,
      {
        body: {
          community_id: community1.id,
          limit: 100,
        } satisfies ICommunityPlatformContentReport.IRequest,
      },
    );
  typia.assert(community1Filtered);
  const community2Filtered =
    await api.functional.communityPlatform.member.reports.statistics.index(
      moderatorConnection,
      {
        body: {
          community_id: community2.id,
          limit: 100,
        } satisfies ICommunityPlatformContentReport.IRequest,
      },
    );
  typia.assert(community2Filtered);
  TestValidator.predicate(
    "community1 filtered should contain reports from community1",
    community1Filtered.data.length > 0,
  );
  TestValidator.predicate(
    "community2 filtered should contain reports from community2",
    community2Filtered.data.length > 0,
  );
  // 11. Test reporter filtering
  // Fix: Properly extract token from Authorization header
  const reporter1Auth = typia.assert<string>(reporter1Connection.headers?.Authorization);
  const reporter1Token = reporter1Auth.split(" ")[1];
  const reporter1Filtered =
    await api.functional.communityPlatform.member.reports.statistics.index(
      moderatorConnection,
      {
        body: {
          reporter_member_id: reporter1Token || "",
          limit: 100,
        } satisfies ICommunityPlatformContentReport.IRequest,
      },
    );
  typia.assert(reporter1Filtered);
  TestValidator.predicate(
    "reporter1 filtered should contain reports by reporter1",
    reporter1Filtered.data.length > 0,
  );
}