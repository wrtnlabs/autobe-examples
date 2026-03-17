import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_reports_reviews_create } from "../../../generate/generate_random_community_platform_member_communities_reports_reviews_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_review } from "../../../prepare/prepare_random_community_platform_report_review";

export async function test_api_moderation_action_post_audit_retrieval_same_community(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    community_platform_community_id: community.id,
    post_type: "text",
    textContent: {
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies ICommunityPlatformPostText.ICreate,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: postBody,
    },
  );
  typia.assert<ICommunityPlatformPost>(post);
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        detail: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert<ICommunityPlatformReport>(report);
  const review =
    await generate_random_community_platform_member_communities_reports_reviews_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
          reportId: report.id,
        },
        body: {
          review_action: "approve",
          note: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformReportReview.ICreate,
      },
    );
  typia.assert<ICommunityPlatformReportReview>(review);
  const moderationActionId = review.id;
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const first =
    await api.functional.communityPlatform.admin.communities.moderationActions.posts.getByCommunityidAndModerationactionid(
      adminConnection,
      {
        communityId: community.id,
        moderationActionId,
      },
    );
  typia.assert<ICommunityPlatformPost>(first);
  TestValidator.equals(
    "retrieved post id matches created post",
    first.id,
    post.id,
  );
  TestValidator.equals(
    "retrieved post title matches created post",
    first.title,
    post.title,
  );
  TestValidator.equals(
    "retrieved post type matches created post",
    first.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "retrieved post status matches created post",
    first.status,
    post.status,
  );
  TestValidator.equals(
    "retrieved post community matches requested community",
    first.community.id,
    community.id,
  );
  TestValidator.equals(
    "retrieved post author matches created post author",
    first.author.id,
    post.author.id,
  );
  TestValidator.equals(
    "retrieved post community matches created post community",
    first.community.id,
    post.community.id,
  );
  TestValidator.predicate(
    "retrieved text post has textContent",
    first.textContent !== null,
  );
  TestValidator.predicate(
    "created text post has textContent",
    post.textContent !== null,
  );
  TestValidator.equals(
    "retrieved text post has no link content",
    first.link,
    null,
  );
  TestValidator.equals(
    "retrieved text post has no image content",
    first.postImage,
    null,
  );
  if (first.textContent !== null && post.textContent !== null) {
    TestValidator.equals(
      "retrieved text body matches created post body",
      first.textContent.body,
      post.textContent.body,
    );
  }
  const second =
    await api.functional.communityPlatform.admin.communities.moderationActions.posts.getByCommunityidAndModerationactionid(
      adminConnection,
      {
        communityId: community.id,
        moderationActionId,
      },
    );
  typia.assert<ICommunityPlatformPost>(second);
  TestValidator.equals(
    "repeated retrieval keeps same post id",
    second.id,
    first.id,
  );
  TestValidator.equals(
    "repeated retrieval keeps same title",
    second.title,
    first.title,
  );
  TestValidator.equals(
    "repeated retrieval keeps same status",
    second.status,
    first.status,
  );
  TestValidator.equals(
    "repeated retrieval keeps same author",
    second.author.id,
    first.author.id,
  );
  TestValidator.equals(
    "repeated retrieval keeps same community",
    second.community.id,
    first.community.id,
  );
  TestValidator.equals(
    "repeated retrieval keeps same created_at",
    second.created_at,
    first.created_at,
  );
  TestValidator.equals(
    "repeated retrieval keeps same updated_at",
    second.updated_at,
    first.updated_at,
  );
  TestValidator.equals(
    "repeated retrieval keeps same deleted_at",
    second.deleted_at,
    first.deleted_at,
  );
  TestValidator.equals(
    "repeated retrieval keeps same link content",
    second.link,
    first.link,
  );
  TestValidator.equals(
    "repeated retrieval keeps same image content",
    second.postImage,
    first.postImage,
  );
  TestValidator.predicate(
    "repeated retrieval keeps textContent",
    second.textContent !== null,
  );
  if (first.textContent !== null && second.textContent !== null) {
    TestValidator.equals(
      "repeated retrieval keeps same text body",
      second.textContent.body,
      first.textContent.body,
    );
  }
}
