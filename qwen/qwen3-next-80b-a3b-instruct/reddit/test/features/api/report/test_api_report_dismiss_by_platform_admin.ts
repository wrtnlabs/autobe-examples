import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_dismiss_by_platform_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create platform admin
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdmin: IRedditCommunityPlatformAdmin.IAuthorized =
    await authorize_platform_admin_join(platformAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    });
  // Create member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityMember.IJoin,
    });
  // Member creates a post
  const post: IRedditCommunityPost =
    await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          community_id: typia.random<string & tags.Format<"uuid">>(),
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 1,
            sentenceMax: 3,
          }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);
  // Member reports the post
  const report: IRedditCommunityReport =
    await generate_random_reddit_community_member_reports_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 15,
          }),
          postId: post.id,
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(report);
  // Confirm report is pending
  TestValidator.equals("report status is pending", report.status, "pending");
  // Platform admin dismisses the report
  const dismissedReport: IRedditCommunityReport =
    await api.functional.redditCommunity.platformAdmin.reports.dismiss.putByReportid(
      platformAdminConnection,
      { reportId: report.id },
    );
  typia.assert(dismissedReport);
  // Validate dismissed report
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "report resolver is platform admin",
    dismissedReport.resolved_by_user?.id,
    platformAdmin.id,
  );
  TestValidator.predicate(
    "report updated_at is after created_at",
    dismissedReport.updated_at > dismissedReport.created_at,
  );
}
