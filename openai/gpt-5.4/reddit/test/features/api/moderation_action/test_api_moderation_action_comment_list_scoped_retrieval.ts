import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationActionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionComment";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationActionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationActionComment";
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
import { prepare_random_community_platform_report_review } from "../../../prepare/prepare_random_community_platform_report_review";

export async function test_api_moderation_action_comment_list_scoped_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin1234!admin" satisfies string;
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const joinedAdmin = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinedAdmin);
  const adminConnection: api.IConnection = { host: connection.host };
  const loggedAdmin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(loggedAdmin);
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Member1234!owner",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  const missingModerationActionId = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestBody = {
    search: RandomGenerator.alphaNumeric(8),
    page: 1,
    limit: 10,
    isDeleted: false,
    sort: "-created_at",
  } satisfies ICommunityPlatformModerationActionComment.IRequest;
  await TestValidator.error(
    "rejects unknown moderation action id within community scope",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderationActions.comments.index(
        adminConnection,
        {
          communityId: community.id,
          moderationActionId: missingModerationActionId,
          body: requestBody,
        },
      );
    },
  );
}
