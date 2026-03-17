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

export async function test_api_report_detail_moderator_reads_post_target_in_own_community(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(joined);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_platform_community_id: community.id,
        post_type: "text",
        textContent: {
          body: postBody,
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const createdReport =
    await generate_random_community_platform_member_reports_create(
      memberConnection,
      {
        body: {
          targetType: "post",
          targetId: post.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          detail: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(createdReport);
  const report =
    await api.functional.communityPlatform.member.communities.reports.at(
      memberConnection,
      {
        communityId: community.id,
        reportId: createdReport.id,
      },
    );
  typia.assert(report);
  TestValidator.equals("report id matches", report.id, createdReport.id);
  TestValidator.equals(
    "report reason matches",
    report.reason,
    createdReport.reason,
  );
  TestValidator.equals(
    "report detail matches",
    report.detail,
    createdReport.detail,
  );
  TestValidator.equals(
    "report status matches",
    report.status,
    createdReport.status,
  );
  TestValidator.equals(
    "report resolution matches",
    report.resolution,
    createdReport.resolution,
  );
  TestValidator.equals(
    "report created_at matches",
    report.created_at,
    createdReport.created_at,
  );
  TestValidator.equals(
    "report updated_at matches",
    report.updated_at,
    createdReport.updated_at,
  );
  TestValidator.equals(
    "report deleted_at matches",
    report.deleted_at,
    createdReport.deleted_at,
  );
  TestValidator.equals(
    "reporter id matches member",
    report.reporter.id,
    joined.id,
  );
  TestValidator.equals(
    "reporter email matches member",
    report.reporter.email,
    joined.email,
  );
  TestValidator.equals(
    "community id matches path",
    report.community.id,
    community.id,
  );
  TestValidator.equals(
    "community title matches created community",
    report.community.title,
    community.title,
  );
  TestValidator.equals(
    "community slug matches created community",
    report.community.slug,
    community.slug,
  );
  TestValidator.predicate(
    "reported post is populated",
    report.reportedPost !== null,
  );
  TestValidator.equals(
    "reported comment is null for post report",
    report.reportedComment,
    null,
  );
  const reportedPost = typia.assert(report.reportedPost!);
  TestValidator.equals("reported post id matches", reportedPost.id, post.id);
  TestValidator.equals(
    "reported post title matches",
    reportedPost.title,
    post.title,
  );
  TestValidator.equals(
    "reported post type matches",
    reportedPost.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "reported post community id matches",
    reportedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "reported post author id matches member",
    reportedPost.author.id,
    joined.id,
  );
}
