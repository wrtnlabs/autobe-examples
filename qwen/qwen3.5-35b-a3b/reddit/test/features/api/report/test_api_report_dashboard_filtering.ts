import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
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
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_dashboard_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Admin user (will be moderator)
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoined: IRedditPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminJoinConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(adminJoined);
  // 2. Create test community with admin as owner (first member joins)
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const memberConnection: api.IConnection = { host: connection.host };
  const createdCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: "Test community for report filtering",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);
  // 3. Add admin as moderator
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  await api.functional.redditPlatform.member.communities.moderators.add(
    adminLoginConnection,
    {
      communityId: createdCommunity.id,
      body: {
        user_id: adminJoined.id,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    },
  );
  // 4. Create reporter member
  const reporterJoinConnection: api.IConnection = { host: connection.host };
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = RandomGenerator.alphaNumeric(16);
  const reporterJoined: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(reporterJoinConnection, {
      body: {
        email: reporterEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: reporterPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(reporterJoined);
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(reporterJoinConnection, {
    body: {
      email: reporterEmail,
      password: reporterPassword,
    } satisfies IRedditPlatformMember.ILogin,
  });
  // 5. Create test posts in the community
  const post1 = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Test Post for Reporting",
        postType: "TEXT",
        redditPlatformCommunityId: createdCommunity.id,
        content: "This is a test post content that can be reported",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  // 6. Create reports with various attributes
  const report1 = await api.functional.redditPlatform.member.reports.create(
    reporterConnection,
    {
      body: {
        community_id: createdCommunity.id,
        reported_content_type: "POST",
        reported_content_id: post1.id,
        reason: "This post violates community guidelines with spam content",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report1);
  const report2 = await api.functional.redditPlatform.member.reports.create(
    reporterConnection,
    {
      body: {
        community_id: createdCommunity.id,
        reported_content_type: "POST",
        reported_content_id: post1.id,
        reason: "Another report for spam and inappropriate material",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report2);
  // 7. Test status filter: PENDING
  const pendingReports =
    await api.functional.redditPlatform.admin.reports.dashboard.index(
      adminLoginConnection,
      {
        body: {
          status: "PENDING",
          limit: 100,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  TestValidator.equals("pending reports count", pendingReports.data.length, 2);
  TestValidator.equals(
    "pending reports total",
    pendingReports.pagination.records,
    2,
  );
  // 8. Test content_type filter: POST
  const postReports =
    await api.functional.redditPlatform.admin.reports.dashboard.index(
      adminLoginConnection,
      {
        body: {
          content_type: "POST",
          limit: 100,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(postReports);
  TestValidator.equals("post reports count", postReports.data.length, 2);
  // 9. Test reporter_id filter
  const reporterFilteredReports =
    await api.functional.redditPlatform.admin.reports.dashboard.index(
      adminLoginConnection,
      {
        body: {
          reporter_id: reporterJoined.id,
          limit: 100,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(reporterFilteredReports);
  TestValidator.equals(
    "reporter filtered count",
    reporterFilteredReports.data.length,
    2,
  );
  // 10. Test community_id filter
  const communityFilteredReports =
    await api.functional.redditPlatform.admin.reports.dashboard.index(
      adminLoginConnection,
      {
        body: {
          community_id: createdCommunity.id,
          limit: 100,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(communityFilteredReports);
  TestValidator.equals(
    "community filtered count",
    communityFilteredReports.data.length,
    2,
  );
  // 11. Test date range filter
  const now = new Date().toISOString();
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
  const dateRangeFilteredReports =
    await api.functional.redditPlatform.admin.reports.dashboard.index(
      adminLoginConnection,
      {
        body: {
          created_after: pastDate,
          created_before: futureDate,
          limit: 100,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(dateRangeFilteredReports);
  TestValidator.equals(
    "date range filtered count",
    dateRangeFilteredReports.data.length,
    2,
  );
  // 12. Test full-text search on reason
  const reasonSearchReports =
    await api.functional.redditPlatform.admin.reports.dashboard.index(
      adminLoginConnection,
      {
        body: {
          reason_search: "spam",
          limit: 100,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(reasonSearchReports);
  TestValidator.equals(
    "reason search count",
    reasonSearchReports.data.length,
    2,
  );
  // 13. Test sort_type: CREATED (default)
  const createdSortReports =
    await api.functional.redditPlatform.admin.reports.dashboard.index(
      adminLoginConnection,
      {
        body: {
          sort_type: "CREATED",
          limit: 100,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(createdSortReports);
  TestValidator.equals("created sort count", createdSortReports.data.length, 2);
  // 14. Test sort_type: PRIORITY
  const prioritySortReports =
    await api.functional.redditPlatform.admin.reports.dashboard.index(
      adminLoginConnection,
      {
        body: {
          sort_type: "PRIORITY",
          limit: 100,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(prioritySortReports);
  TestValidator.equals(
    "priority sort count",
    prioritySortReports.data.length,
    2,
  );
  // 15. Test pagination: page and limit
  const paginationReports =
    await api.functional.redditPlatform.admin.reports.dashboard.index(
      adminLoginConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(paginationReports);
  TestValidator.equals(
    "pagination page 1 count",
    paginationReports.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page",
    paginationReports.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records total",
    paginationReports.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination pages count",
    paginationReports.pagination.pages,
    2,
  );
  // 16. Test combined filters: status + content_type + reporter
  const combinedFilteredReports =
    await api.functional.redditPlatform.admin.reports.dashboard.index(
      adminLoginConnection,
      {
        body: {
          status: "PENDING",
          content_type: "POST",
          reporter_id: reporterJoined.id,
          limit: 100,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(combinedFilteredReports);
  TestValidator.equals(
    "combined filters count",
    combinedFilteredReports.data.length,
    2,
  );
  // 17. Test empty results with invalid community_id
  const emptyFilteredReports =
    await api.functional.redditPlatform.admin.reports.dashboard.index(
      adminLoginConnection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          limit: 100,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(emptyFilteredReports);
  TestValidator.equals(
    "empty results count",
    emptyFilteredReports.data.length,
    0,
  );
  TestValidator.equals(
    "empty results total records",
    emptyFilteredReports.pagination.records,
    0,
  );
}
