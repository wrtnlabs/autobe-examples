import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_detail_moderator_views_reported_post(
  connection: api.IConnection,
): Promise<void> {
  const moderatorConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const post = await generate_random_community_platform_member_posts_create(
    moderatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_platform_community_id: community.id,
        post_type: "text",
        textContent: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const reportReason = RandomGenerator.paragraph({ sentences: 3 });
  const reportDetail = RandomGenerator.content({ paragraphs: 2 });
  const report = await generate_random_community_platform_member_reports_create(
    moderatorConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        reason: reportReason,
        detail: reportDetail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.predicate(
    "created report resolves reported post",
    report.reportedPost !== null,
  );
  TestValidator.equals(
    "created report has no reported comment",
    report.reportedComment,
    null,
  );
  const createdReportedPost = typia.assert<NonNullable<typeof report.reportedPost>>(
    report.reportedPost,
  );
  const detail = await api.functional.communityPlatform.member.reports.at(
    moderatorConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals(
    "report id matches created report",
    detail.id,
    report.id,
  );
  TestValidator.equals(
    "report reason matches created report",
    detail.reason,
    report.reason,
  );
  TestValidator.equals(
    "report detail matches created report",
    detail.detail,
    report.detail,
  );
  TestValidator.equals(
    "report status remains unchanged after read",
    detail.status,
    report.status,
  );
  TestValidator.equals(
    "report resolution remains unchanged after read",
    detail.resolution,
    report.resolution,
  );
  TestValidator.equals(
    "report created_at remains unchanged after read",
    detail.created_at,
    report.created_at,
  );
  TestValidator.equals(
    "report updated_at remains unchanged after read",
    detail.updated_at,
    report.updated_at,
  );
  TestValidator.equals(
    "report deleted_at remains unchanged after read",
    detail.deleted_at,
    report.deleted_at,
  );
  TestValidator.equals(
    "reporter summary matches created report",
    detail.reporter,
    report.reporter,
  );
  TestValidator.equals(
    "community summary matches created report",
    detail.community,
    report.community,
  );
  TestValidator.equals(
    "community id matches created community",
    detail.community.id,
    community.id,
  );
  TestValidator.predicate(
    "detail resolves reported post",
    detail.reportedPost !== null,
  );
  TestValidator.equals(
    "detail has no reported comment",
    detail.reportedComment,
    null,
  );
  const detailedReportedPost = typia.assert<NonNullable<typeof detail.reportedPost>>(
    detail.reportedPost,
  );
  TestValidator.equals(
    "reported post id matches created post",
    detailedReportedPost.id,
    post.id,
  );
  TestValidator.equals(
    "reported post title matches created post",
    detailedReportedPost.title,
    post.title,
  );
  TestValidator.equals(
    "reported post community matches created community",
    detailedReportedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "reported post id remains unchanged after read",
    detailedReportedPost.id,
    createdReportedPost.id,
  );
  TestValidator.equals(
    "reported post title remains unchanged after read",
    detailedReportedPost.title,
    createdReportedPost.title,
  );
  TestValidator.equals(
    "reported post status remains unchanged after read",
    detailedReportedPost.status,
    createdReportedPost.status,
  );
  TestValidator.equals(
    "reported post community summary remains unchanged after read",
    detailedReportedPost.community,
    createdReportedPost.community,
  );
}
