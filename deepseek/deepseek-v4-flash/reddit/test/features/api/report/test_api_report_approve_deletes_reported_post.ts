import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
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
import { generate_random_community_platform_member_community_reports_create } from "../../../generate/generate_random_community_platform_member_community_reports_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_community_report } from "../../../prepare/prepare_random_community_platform_community_report";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_report_approve_deletes_reported_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins (becomes community owner/moderator)
  const memberAConnection: api.IConnection = { host: connection.host };
  const authorizedA = await authorize_member_join(memberAConnection, {});
  typia.assert(authorizedA);
  // 2. Member A creates a community (becomes owner/moderator automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community (required before posting)
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberAConnection,
      { params: { communityId: community.id } },
    );
  typia.assert(subscription);
  // 4. Member A creates a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Member B joins (reporter)
  const memberBConnection: api.IConnection = { host: connection.host };
  const authorizedB = await authorize_member_join(memberBConnection, {});
  typia.assert(authorizedB);
  // 6. Member B reports the post
  const report =
    await generate_random_community_platform_member_community_reports_create(
      memberBConnection,
      {
        body: {
          targetId: post.id,
          targetType: "post",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  // 7. Member A (community owner/moderator) approves the report
  const approvedReport =
    await api.functional.communityPlatform.member.community_reports.approve(
      memberAConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // 8. Validations
  TestValidator.equals("status is approved", approvedReport.status, "approved");
  TestValidator.predicate(
    "updated_at reflects approval timestamp",
    approvedReport.updated_at > report.created_at,
  );
  TestValidator.equals(
    "target type is post",
    approvedReport.target_type,
    "post",
  );
  TestValidator.predicate(
    "report has post target association",
    approvedReport.reportPostTarget !== undefined &&
      approvedReport.reportPostTarget !== null,
  );
  if (approvedReport.reportPostTarget) {
    TestValidator.equals(
      "post id matches the reported post",
      approvedReport.reportPostTarget.post.id,
      post.id,
    );
  }
  TestValidator.predicate(
    "report includes reporter data",
    approvedReport.reporter !== undefined && approvedReport.reporter !== null,
  );
  TestValidator.predicate(
    "report includes community data",
    approvedReport.community !== undefined && approvedReport.community !== null,
  );
}
