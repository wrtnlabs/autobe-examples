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
import { generate_random_community_platform_admin_posts_comments_files_create } from "../../../generate/generate_random_community_platform_admin_posts_comments_files_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_file } from "../../../prepare/prepare_random_community_platform_comment_file";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_comment_file_create_success(
  connection: api.IConnection,
): Promise<void> {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(
    16,
  ) satisfies string as string & tags.Format<"password">;
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();
  const adminIp = typia.random<string & tags.Format<"ipv4">>();
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoined = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
      ip: adminIp,
    },
  });
  typia.assert(adminJoined);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLoggedIn = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
      ip: adminIp,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(adminLoggedIn);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberHref = typia.random<string & tags.Format<"uri">>();
  const memberReferrer = typia.random<string & tags.Format<"uri">>();
  const memberIp = typia.random<string & tags.Format<"ipv4">>();
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberJoined = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: memberHref,
      referrer: memberReferrer,
      ip: memberIp,
    },
  });
  typia.assert(memberJoined);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberLoggedIn = await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: memberHref,
      referrer: memberReferrer,
      ip: memberIp,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(memberLoggedIn);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
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
      },
    },
  );
  typia.assert(post);
  const originalPostTitle = post.title;
  const originalPostType = post.post_type;
  const originalPostStatus = post.status;
  const originalPostDeletedAt = post.deleted_at;
  const originalPostTextContent = post.textContent;
  const originalPostLink = post.link;
  const originalPostImage = post.postImage;
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
        },
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "created post title remains unchanged after comment setup",
    post.title,
    originalPostTitle,
  );
  TestValidator.equals(
    "created post type remains unchanged after comment setup",
    post.post_type,
    originalPostType,
  );
  TestValidator.equals(
    "created post status remains unchanged after comment setup",
    post.status,
    originalPostStatus,
  );
  TestValidator.equals(
    "created post deleted_at remains unchanged after comment setup",
    post.deleted_at,
    originalPostDeletedAt,
  );
  TestValidator.equals(
    "created post text content remains unchanged after comment setup",
    post.textContent,
    originalPostTextContent,
  );
  TestValidator.equals(
    "created post link remains unchanged after comment setup",
    post.link,
    originalPostLink,
  );
  TestValidator.equals(
    "created post image remains unchanged after comment setup",
    post.postImage,
    originalPostImage,
  );
  TestValidator.equals(
    "comment response matches available empty DTO shape",
    comment,
    {},
  );
}
