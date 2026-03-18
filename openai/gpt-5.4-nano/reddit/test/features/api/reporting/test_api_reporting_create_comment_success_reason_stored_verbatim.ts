import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import type { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_vote_comment } from "../../../prepare/prepare_random_community_platform_post_vote_comment";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_reporting_create_comment_success_reason_stored_verbatim(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = typia.assert<ICommunityPlatformMember.IAuthorized>(
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    }),
  );
  const reporterId = member.id;
  const community = typia.assert<ICommunityPlatformCommunity>(
    await generate_random_community_platform_communities_create(
      memberConnection,
      {},
    ),
  );
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = typia.assert<ICommunityPlatformPostVoteComment>(
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId },
        body: {
          bodyText: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: null,
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    ),
  );
  const reason =
    "Distinct reason: reported comment contains inaccurate information (verbatim).";
  const report = typia.assert<ICommunityPlatformReport>(
    await api.functional.communityPlatform.member.reports.create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          targetType: "comment",
          targetId: comment.id,
          reason,
        } satisfies ICommunityPlatformReport.ICreate,
      },
    ),
  );
  TestValidator.equals(
    "community id matches",
    report.community.id,
    community.id,
  );
  TestValidator.equals("targetType is comment", report.targetType, "comment");
  TestValidator.equals("targetId matches comment", report.targetId, comment.id);
  TestValidator.equals("reason stored verbatim", report.reason, reason);
  TestValidator.equals(
    "reporter id matches authenticated member",
    report.reporter.id,
    reporterId,
  );
}
