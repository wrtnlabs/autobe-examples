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

export async function test_api_report_post_submission_routes_to_post_community(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
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
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: postTitle,
        community_platform_community_id: community.id,
        post_type: "text",
        textContent: {
          body: postBody,
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const reason = RandomGenerator.paragraph({ sentences: 4 });
  const detail = RandomGenerator.content({ paragraphs: 2 });
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        reason,
        detail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "reporter is authenticated member",
    report.reporter.id,
    authorized.id,
  );
  TestValidator.equals(
    "report community derives from post community",
    report.community.id,
    post.community.id,
  );
  TestValidator.equals(
    "report community title matches post community",
    report.community.title,
    post.community.title,
  );
  TestValidator.equals(
    "report community slug matches post community",
    report.community.slug,
    post.community.slug,
  );
  TestValidator.equals(
    "reported comment is null for post report",
    report.reportedComment,
    null,
  );
  TestValidator.equals("report reason preserved", report.reason, reason);
  TestValidator.equals("report detail preserved", report.detail, detail);
  TestValidator.equals(
    "report resolution starts null",
    report.resolution,
    null,
  );
  TestValidator.predicate(
    "report status is server controlled and non-empty",
    report.status.length > 0,
  );
  TestValidator.predicate(
    "reported post populated",
    report.reportedPost !== null,
  );
  const reportedPost = typia.assert(report.reportedPost!);
  TestValidator.equals(
    "reported post id matches created post",
    reportedPost.id,
    post.id,
  );
  TestValidator.equals(
    "reported post title matches created post",
    reportedPost.title,
    post.title,
  );
  TestValidator.equals(
    "reported post community id matches created post community",
    reportedPost.community.id,
    post.community.id,
  );
  TestValidator.equals(
    "reported post preserves original post identity by id",
    post.id,
    reportedPost.id,
  );
  TestValidator.equals(
    "original post title remains intact after reporting",
    post.title,
    postTitle,
  );
  TestValidator.equals(
    "original post community remains intact after reporting",
    post.community.id,
    community.id,
  );
}
