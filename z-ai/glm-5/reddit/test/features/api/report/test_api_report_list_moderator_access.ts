import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_list_moderator_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator (community owner)
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {});
  // Step 2: Create community (creator becomes owner and moderator)
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Create post author and create a post
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      authorConnection,
      {
        params: { communityId: community.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          postType: "text",
          content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(post);
  // Step 4: Create reporter and submit a report
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        community_id: community.id,
        target_type: "post",
        target_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(report);
  // Step 5: Moderator retrieves reports list
  const reportsPage =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          community_id: community.id,
          status: "pending",
          target_type: "post",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(reportsPage);
  // Validate pagination metadata
  TestValidator.equals("current page", reportsPage.pagination.current, 1);
  TestValidator.equals("limit", reportsPage.pagination.limit, 10);
  TestValidator.equals("total records", reportsPage.pagination.records, 1);
  TestValidator.equals("total pages", reportsPage.pagination.pages, 1);
  // Validate report exists in results
  TestValidator.predicate(
    "report found in list",
    reportsPage.data.some((r) => r.id === report.id),
  );
  const foundReport = typia.assert<ICommunityPlatformReport.ISummary>(
    reportsPage.data.find((r) => r.id === report.id)!,
  );
  // Validate report details
  TestValidator.equals("report status", foundReport.status, "pending");
  TestValidator.equals("report reason", foundReport.reason, report.reason);
  TestValidator.equals("target type", foundReport.target_type, "post");
  // Validate reporter info
  TestValidator.equals("reporter id", foundReport.member.id, report.member.id);
  TestValidator.equals(
    "reporter username",
    foundReport.member.username,
    report.member.username,
  );
  // Validate community info
  TestValidator.equals("community id", foundReport.community.id, community.id);
  TestValidator.equals(
    "community name",
    foundReport.community.name,
    community.name,
  );
  // Validate post info
  TestValidator.predicate("post info exists", foundReport.post !== null);
  if (foundReport.post !== null) {
    TestValidator.equals("post id", foundReport.post.id, post.id);
    TestValidator.equals("post title", foundReport.post.title, post.title);
  }
  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(foundReport.created_at),
  );
  TestValidator.equals(
    "resolved_at is null for pending",
    foundReport.resolved_at,
    null,
  );
}
