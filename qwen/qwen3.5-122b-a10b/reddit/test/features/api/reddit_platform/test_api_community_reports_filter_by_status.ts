import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_community_reports_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account (community owner)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 2. Create community (owner becomes moderator automatically)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create regular member who will submit reports
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(reporterAuth);
  // 4. Create posts for reporting
  const post1 = await generate_random_reddit_platform_member_posts_create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_platform_member_posts_create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  const post3 = await generate_random_reddit_platform_member_posts_create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post3);
  // 5. Submit reports
  const report1 = await generate_random_reddit_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        post_id: post1.id,
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report1);
  const report2 = await generate_random_reddit_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        post_id: post2.id,
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report2);
  const report3 = await generate_random_reddit_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        post_id: post3.id,
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report3);
  // 6. Approve report2
  const approvedReport =
    await api.functional.redditPlatform.member.reports.approve(
      moderatorConnection,
      {
        reportId: report2.id,
      },
    );
  typia.assert(approvedReport);
  // 7. Dismiss report3
  const dismissedReport =
    await api.functional.redditPlatform.member.reports.dismiss(
      moderatorConnection,
      {
        reportId: report3.id,
        body: {},
      },
    );
  typia.assert(dismissedReport);
  // 8. Test filtering by pending status
  const pendingReports =
    await api.functional.redditPlatform.member.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          status: "pending",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  TestValidator.equals("pending reports count", pendingReports.data.length, 1);
  TestValidator.equals(
    "pending report is report1",
    pendingReports.data[0].id,
    report1.id,
  );
  TestValidator.equals(
    "pending report status",
    pendingReports.data[0].status,
    "pending",
  );
  // 9. Test filtering by approved status
  const approvedReports =
    await api.functional.redditPlatform.member.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          status: "approved",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(approvedReports);
  TestValidator.equals(
    "approved reports count",
    approvedReports.data.length,
    1,
  );
  TestValidator.equals(
    "approved report is report2",
    approvedReports.data[0].id,
    report2.id,
  );
  TestValidator.equals(
    "approved report status",
    approvedReports.data[0].status,
    "approved",
  );
  // 10. Test filtering by dismissed status
  const dismissedReports =
    await api.functional.redditPlatform.member.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          status: "dismissed",
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(dismissedReports);
  TestValidator.equals(
    "dismissed reports count",
    dismissedReports.data.length,
    1,
  );
  TestValidator.equals(
    "dismissed report is report3",
    dismissedReports.data[0].id,
    report3.id,
  );
  TestValidator.equals(
    "dismissed report status",
    dismissedReports.data[0].status,
    "dismissed",
  );
  // 11. Test without status filter (default is pending)
  const allReports =
    await api.functional.redditPlatform.member.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {} satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(allReports);
  TestValidator.equals("all reports count", allReports.data.length, 3);
  // 12. Test pagination
  const paginatedReports =
    await api.functional.redditPlatform.member.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          status: "pending",
          page: 1,
          limit: 1,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(paginatedReports);
  TestValidator.equals(
    "pagination current",
    paginatedReports.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedReports.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination records",
    paginatedReports.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages",
    paginatedReports.pagination.pages,
    1,
  );
}