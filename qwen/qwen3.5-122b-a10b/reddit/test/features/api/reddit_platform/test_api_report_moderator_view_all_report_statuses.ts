import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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

export async function test_api_report_moderator_view_all_report_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (community owner/moderator)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community - owner becomes moderator automatically
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create second member (content creator and reporter)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 4. Second member subscribes to community
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 5. Second member creates a post in the community
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create three reports on the same post
  const report1 = await generate_random_reddit_platform_member_reports_create(
    memberConnection,
    {
      body: {
        reason: "This is report 1 - will remain pending",
        post_id: post.id,
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report1);
  const report2 = await generate_random_reddit_platform_member_reports_create(
    memberConnection,
    {
      body: {
        reason: "This is report 2 - will be approved",
        post_id: post.id,
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report2);
  const report3 = await generate_random_reddit_platform_member_reports_create(
    memberConnection,
    {
      body: {
        reason: "This is report 3 - will be dismissed",
        post_id: post.id,
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report3);
  // 7. Owner (moderator) approves report 2
  const approvedReport =
    await api.functional.redditPlatform.member.reports.approve(
      ownerConnection,
      {
        reportId: report2.id,
      },
    );
  typia.assert(approvedReport);
  // 8. Owner (moderator) dismisses report 3
  const dismissedReport =
    await api.functional.redditPlatform.member.reports.dismiss(
      ownerConnection,
      {
        reportId: report3.id,
        body: {},
      },
    );
  typia.assert(dismissedReport);
  // 9. Owner (moderator) views all reports for the community
  const reportsPage =
    await api.functional.redditPlatform.member.communities.reports.at(
      ownerConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(reportsPage);
  // 10. Validate that all three reports are visible with correct statuses
  TestValidator.equals("report count should be 3", reportsPage.data.length, 3);
  const pendingReport = reportsPage.data.find((r) => r.id === report1.id);
  const approvedReportFound = reportsPage.data.find((r) => r.id === report2.id);
  const dismissedReportFound = reportsPage.data.find(
    (r) => r.id === report3.id,
  );
  if (pendingReport === undefined)
    throw new Error("pendingReport is undefined");
  if (approvedReportFound === undefined)
    throw new Error("approvedReportFound is undefined");
  if (dismissedReportFound === undefined)
    throw new Error("dismissedReportFound is undefined");
  TestValidator.equals(
    "pending report status",
    pendingReport.status,
    "pending",
  );
  TestValidator.equals(
    "approved report status",
    approvedReportFound.status,
    "approved",
  );
  TestValidator.equals(
    "dismissed report status",
    dismissedReportFound.status,
    "dismissed",
  );
  // 11. Validate reporter information is preserved
  TestValidator.predicate(
    "pending report has reporter",
    pendingReport.reporter !== undefined,
  );
  TestValidator.predicate(
    "approved report has reporter",
    approvedReportFound.reporter !== undefined,
  );
  TestValidator.predicate(
    "dismissed report has reporter",
    dismissedReportFound.reporter !== undefined,
  );
  // 12. Validate report reasons are preserved
  TestValidator.equals(
    "pending report reason",
    pendingReport.reason,
    "This is report 1 - will remain pending",
  );
  TestValidator.equals(
    "approved report reason",
    approvedReportFound.reason,
    "This is report 2 - will be approved",
  );
  TestValidator.equals(
    "dismissed report reason",
    dismissedReportFound.reason,
    "This is report 3 - will be dismissed",
  );
  // 13. Validate timestamps exist
  TestValidator.predicate(
    "pending report has created_at",
    pendingReport.created_at !== undefined,
  );
  TestValidator.predicate(
    "approved report has created_at",
    approvedReportFound.created_at !== undefined,
  );
  TestValidator.predicate(
    "dismissed report has created_at",
    dismissedReportFound.created_at !== undefined,
  );
  // 14. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    reportsPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records",
    reportsPage.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination limit exists",
    reportsPage.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination pages calculated",
    reportsPage.pagination.pages >= 1,
    true,
  );
}