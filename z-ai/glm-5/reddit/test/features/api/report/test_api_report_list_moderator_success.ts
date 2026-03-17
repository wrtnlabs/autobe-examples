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

export async function test_api_report_list_moderator_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A joins and creates a community (becomes owner/moderator)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Step 2: Member B joins, subscribes to community, and creates a post
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // Member B creates a post (this will auto-subscribe if needed based on business logic)
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberBConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  // Step 3: Member C joins, subscribes to community, and reports Member B's post
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  const reportReason = RandomGenerator.paragraph({ sentences: 3 });
  const report = await generate_random_community_platform_member_reports_create(
    memberCConnection,
    {
      body: {
        community_id: community.id,
        target_type: "post",
        target_id: post.id,
        reason: reportReason,
      },
    },
  );
  typia.assert(report);
  // Step 4: Member A (moderator) retrieves the reports list
  const reportsPage =
    await api.functional.communityPlatform.member.communities.reports.index(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          status: "pending",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(reportsPage);
  // Validate at least one report exists
  TestValidator.predicate(
    "at least one report exists",
    () => reportsPage.data.length > 0,
  );
  // Find the report we just created
  const foundReport = reportsPage.data.find((r) => r.id === report.id);
  TestValidator.predicate(
    "created report found in list",
    () => foundReport !== undefined,
  );
  // Validate report structure
  if (foundReport) {
    TestValidator.equals(
      "report status is pending",
      foundReport.status,
      "pending",
    );
    TestValidator.equals(
      "report target type is post",
      foundReport.target_type,
      "post",
    );
    TestValidator.equals(
      "report reason matches",
      foundReport.reason,
      reportReason,
    );
    // Validate reporter info
    TestValidator.equals(
      "reporter id matches member C",
      foundReport.member.id,
      memberC.id,
    );
    // Validate target post info
    TestValidator.predicate(
      "post info exists in report",
      () => foundReport.post !== null,
    );
    if (foundReport.post) {
      TestValidator.equals("post id matches", foundReport.post.id, post.id);
      TestValidator.equals(
        "post title matches",
        foundReport.post.title,
        post.title,
      );
    }
  }
  // Validate only pending reports are returned
  const allPending = reportsPage.data.every((r) => r.status === "pending");
  TestValidator.predicate("all reports have pending status", allPending);
  // Validate sorting (newest first - created_at descending)
  if (reportsPage.data.length > 1) {
    const isSorted = reportsPage.data.every((item, index, arr) => {
      if (index === 0) return true;
      const prevTime = new Date(arr[index - 1].created_at).getTime();
      const currTime = new Date(item.created_at).getTime();
      return prevTime >= currTime;
    });
    TestValidator.predicate(
      "reports sorted by created_at descending",
      isSorted,
    );
  }
}
