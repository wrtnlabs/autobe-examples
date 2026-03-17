import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentFile";
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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_comment_file_post_comment_scope_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert<ICommunityPlatformMember.IAuthorized>(memberAuthorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  const firstPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          community_platform_community_id: community.id,
          post_type: "text",
          textContent: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPost>(firstPost);
  const secondPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          community_platform_community_id: community.id,
          post_type: "text",
          textContent: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPost>(secondPost);
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: firstPost.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
          parentId: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);
  const commentId = typia.assert<string & tags.Format<"uuid">>(
    (comment as Record<string, unknown>)["id"],
  );
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert<ICommunityPlatformAdmin.IAuthorized>(adminAuthorized);
  await TestValidator.error(
    "post-comment scope mismatch is rejected",
    async () => {
      await api.functional.communityPlatform.admin.posts.comments.files.index(
        adminConnection,
        {
          postId: secondPost.id,
          commentId,
          body: {
            page: 1,
            limit: 10,
            sort: "createdAt:desc",
          } satisfies ICommunityPlatformCommentFile.IRequest,
        },
      );
    },
  );
}
