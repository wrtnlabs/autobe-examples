import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_files_create } from "../../../generate/generate_random_community_platform_member_posts_comments_files_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_file } from "../../../prepare/prepare_random_community_platform_comment_file";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_comment_file_detail_removed_parent_comment_hidden(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
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
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
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
        },
      },
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
        },
      },
    );
  typia.assert(comment);
  const commentId = typia.assert<string & tags.Format<"uuid">>(
    (comment as Record<string, unknown>).id,
  );
  const createdFile =
    await generate_random_community_platform_member_posts_comments_files_create(
      memberConnection,
      {
        params: {
          postId: post.id,
          commentId,
        },
        body: {
          original_name: `attachment-${RandomGenerator.alphaNumeric(6)}.txt`,
          mime_type: "text/plain",
          storage_key: `comment-files/${RandomGenerator.alphaNumeric(16)}`,
          size: 128,
        },
      },
    );
  typia.assert(createdFile);
  const foundFile =
    await api.functional.communityPlatform.member.posts.comments.files.at(
      memberConnection,
      {
        postId: post.id,
        commentId,
        fileId: createdFile.id,
      },
    );
  typia.assert(foundFile);
  TestValidator.equals(
    "file id matches created file",
    foundFile.id,
    createdFile.id,
  );
  TestValidator.equals(
    "original filename matches created file",
    foundFile.original_name,
    createdFile.original_name,
  );
  TestValidator.equals(
    "mime type matches created file",
    foundFile.mime_type,
    createdFile.mime_type,
  );
  TestValidator.equals(
    "storage key matches created file",
    foundFile.storage_key,
    createdFile.storage_key,
  );
  TestValidator.equals(
    "file size matches created file",
    foundFile.size,
    createdFile.size,
  );
  await api.functional.communityPlatform.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId,
    },
  );
  await TestValidator.error(
    "removed parent comment hides attachment detail",
    async () => {
      await api.functional.communityPlatform.member.posts.comments.files.at(
        memberConnection,
        {
          postId: post.id,
          commentId,
          fileId: createdFile.id,
        },
      );
    },
  );
}
