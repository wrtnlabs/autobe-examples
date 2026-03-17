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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_comment_submission_uses_parent_post_community(
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
    },
  });
  typia.assert(authorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
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
    memberConnection,
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
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
          parentId: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  const commentEntity = typia.assert<IEntity>(comment);
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const detail = RandomGenerator.content({ paragraphs: 2 });
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
    {
      body: {
        targetType: "comment",
        targetId: commentEntity.id,
        reason,
        detail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "report reason matches submission",
    report.reason,
    reason,
  );
  TestValidator.equals(
    "report detail matches submission",
    report.detail,
    detail,
  );
  TestValidator.equals(
    "reporter is authenticated member",
    report.reporter.id,
    authorized.id,
  );
  TestValidator.equals(
    "report community comes from parent post community",
    report.community.id,
    post.community.id,
  );
  TestValidator.equals(
    "reported post is null for comment report",
    report.reportedPost,
    null,
  );
  TestValidator.notEquals(
    "reported comment is populated for comment report",
    report.reportedComment,
    null,
  );
  typia.assert(report.reportedComment!);
}
