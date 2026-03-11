import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import type { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReportView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportView";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportView";
import type { IResolutionRatePoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IResolutionRatePoint";
import type { ISLABreach } from "@ORGANIZATION/PROJECT-api/lib/structures/ISLABreach";
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
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_view_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminJoinResponse);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 2. Community creation - Admin creates a community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Member setup - Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberJoinResponse = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberJoinResponse);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditPlatformMember.ILogin,
  });
  // 4. Report submission - Member submits a report for content in the community
  const report = typia.assert<IRedditPlatformReport.ISummary>(
    await api.functional.redditPlatform.member.reports.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          reported_content_type: "POST",
          reported_content_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3, wordMin: 10 }),
        } satisfies IRedditPlatformReport.ICreate,
      },
    ),
  );
  // 5. View history retrieval - Admin calls the target endpoint
  // Note: According to scenario, calling this endpoint should auto-create a view record
  const viewHistoryResponse =
    await api.functional.redditPlatform.admin.reports.views.index(
      adminConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(viewHistoryResponse);
  // 6. Validate response structure
  TestValidator.equals(
    "has pagination",
    typeof viewHistoryResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(viewHistoryResponse.data),
    true,
  );
  // 7. Validate first call creates a view record
  TestValidator.equals(
    "view history has 1 record",
    viewHistoryResponse.data.length,
    1,
  );
  const firstView = viewHistoryResponse.data[0];
  typia.assert(firstView);
  // 8. Validate moderator information from IRedditPlatformAdmin.ISummary
  TestValidator.equals(
    "view record has moderator",
    firstView.moderator !== null,
    true,
  );
  TestValidator.equals(
    "moderator id matches admin",
    firstView.moderator.id,
    adminJoinResponse.id,
  );
  TestValidator.equals(
    "moderator username matches",
    firstView.moderator.username,
    adminJoinResponse.username,
  );
  TestValidator.equals(
    "moderator display_name matches",
    firstView.moderator.display_name,
    adminJoinResponse.display_name,
  );
  // 9. Validate report information from IRedditPlatformReport.ISummary
  TestValidator.equals(
    "view record has report",
    firstView.report !== null,
    true,
  );
  TestValidator.equals("report id matches", firstView.report.id, report.id);
  TestValidator.equals(
    "report reason matches",
    firstView.report.reason,
    report.reason,
  );
  TestValidator.equals(
    "report status is PENDING",
    firstView.report.status,
    "PENDING",
  );
  // 10. Validate viewed_at timestamp is accurate
  TestValidator.predicate(
    "viewed_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      firstView.viewed_at,
    ),
  );
  // 11. Validate pagination metadata from IPage.IPagination
  const pagination = viewHistoryResponse.pagination;
  typia.assert(pagination);
  TestValidator.equals("pagination current is 1", pagination.current, 1);
  TestValidator.equals("pagination limit is 10", pagination.limit, 10);
  TestValidator.equals("pagination records is 1", pagination.records, 1);
  TestValidator.equals("pagination pages is 1", pagination.pages, 1);
  // 12. Test empty view history scenario - Create another report without any views
  const emptyReport = typia.assert<IRedditPlatformReport.ISummary>(
    await api.functional.redditPlatform.member.reports.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          reported_content_type: "COMMENT",
          reported_content_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2, wordMin: 10 }),
        } satisfies IRedditPlatformReport.ICreate,
      },
    ),
  );
  const emptyViewHistory =
    await api.functional.redditPlatform.admin.reports.views.index(
      adminConnection,
      {
        reportId: emptyReport.id,
      },
    );
  typia.assert(emptyViewHistory);
  TestValidator.equals(
    "empty view history has 0 records",
    emptyViewHistory.data.length,
    0,
  );
  TestValidator.equals(
    "empty pagination records is 0",
    emptyViewHistory.pagination.records,
    0,
  );
}
