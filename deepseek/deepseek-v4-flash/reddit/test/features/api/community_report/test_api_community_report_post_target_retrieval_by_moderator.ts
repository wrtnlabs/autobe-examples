import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCommentTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCommentTarget";
import type { ICommunityPlatformReportPostTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportPostTarget";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_community_report_post_target_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A registers (will become community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuthorized);
  // Step 2: Member A creates a community (becomes owner with moderation authority)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Member B registers (content creator and reporter)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuthorized);
  // Step 4: Member B subscribes to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberBConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // Step 5: Member B creates a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        communityId: community.id,
        type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // Step 6: Member B submits a report against the post
  const reportReason = RandomGenerator.paragraph({ sentences: 1 });
  const report = await generate_random_community_platform_member_reports_create(
    memberBConnection,
    {
      body: {
        reason: reportReason,
        targetType: "post" as const,
        targetId: post.id,
      },
    },
  );
  typia.assert(report);
  // Step 7: Member A (owner/moderator) retrieves the report
  const retrievedReport =
    await api.functional.communityPlatform.member.community_reports.at(
      memberAConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);
  // Step 8: Validate all report fields
  TestValidator.equals("report id matches", retrievedReport.id, report.id);
  TestValidator.equals("target type is post", retrievedReport.target_type, "post");
  TestValidator.equals("status is pending", retrievedReport.status, "pending");
  TestValidator.equals("reason matches", retrievedReport.reason, reportReason);
  TestValidator.equals("reporter id matches", retrievedReport.reporter.id, memberBAuthorized.id);
  TestValidator.equals("reporter username matches", retrievedReport.reporter.username, memberBAuthorized.username);
  TestValidator.equals("community name matches", retrievedReport.community.name, community.name);
  TestValidator.predicate(
    "reportPostTarget is populated",
    () => retrievedReport.reportPostTarget !== undefined,
  );
  TestValidator.equals(
    "commentTarget is absent",
    retrievedReport.commentTarget,
    undefined,
  );
  TestValidator.equals("deleted_at is null", retrievedReport.deleted_at, null);
  TestValidator.predicate(
    "created_at is valid",
    () => typeof retrievedReport.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is valid",
    () => typeof retrievedReport.updated_at === "string",
  );
  // Step 9: Validate reportPostTarget details
  const reportPostTarget = retrievedReport.reportPostTarget!;
  TestValidator.equals(
    "reportPostTarget.post id matches",
    reportPostTarget.post.id,
    post.id,
  );
  TestValidator.equals(
    "reportPostTarget.report id matches",
    reportPostTarget.report.id,
    report.id,
  );
}
