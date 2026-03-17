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

export async function test_api_comment_file_deleted_comment_and_storage_key_conflict(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234!" satisfies string as string &
      tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberJoinBody,
  });
  typia.assert(memberAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
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
  const commentIdentity = typia.assert<{
    id: string & tags.Format<"uuid">;
  }>(comment);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234!" satisfies string as string &
      tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  const firstAttachmentBody = {
    original_name: `comment-file-${RandomGenerator.alphaNumeric(8)}.txt`,
    mime_type: "text/plain",
    storage_key: `comment-files/${RandomGenerator.alphaNumeric(16)}`,
    size: 128 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformCommentFile.ICreate;
  const firstAttachment =
    await generate_random_community_platform_admin_posts_comments_files_create(
      adminConnection,
      {
        params: {
          postId: post.id,
          commentId: commentIdentity.id,
        },
        body: firstAttachmentBody,
      },
    );
  typia.assert(firstAttachment);
  TestValidator.equals(
    "first attachment original name preserved",
    firstAttachment.original_name,
    firstAttachmentBody.original_name,
  );
  TestValidator.equals(
    "first attachment mime type preserved",
    firstAttachment.mime_type,
    firstAttachmentBody.mime_type,
  );
  TestValidator.equals(
    "first attachment storage key preserved",
    firstAttachment.storage_key,
    firstAttachmentBody.storage_key,
  );
  TestValidator.equals(
    "first attachment size preserved",
    firstAttachment.size,
    firstAttachmentBody.size,
  );
  TestValidator.equals(
    "first attachment remains active",
    firstAttachment.deleted_at,
    null,
  );
  const originalAttachmentId = firstAttachment.id;
  const originalAttachmentCreatedAt = firstAttachment.created_at;
  const originalAttachmentUpdatedAt = firstAttachment.updated_at;
  const originalAttachmentOriginalName = firstAttachment.original_name;
  const originalAttachmentMimeType = firstAttachment.mime_type;
  const originalAttachmentStorageKey = firstAttachment.storage_key;
  const originalAttachmentSize = firstAttachment.size;
  await TestValidator.error("duplicate storage key rejected", async () => {
    await generate_random_community_platform_admin_posts_comments_files_create(
      adminConnection,
      {
        params: {
          postId: post.id,
          commentId: commentIdentity.id,
        },
        body: {
          original_name: `duplicate-${RandomGenerator.alphaNumeric(8)}.txt`,
          mime_type: "text/plain",
          storage_key: firstAttachmentBody.storage_key,
          size: 256 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
        } satisfies ICommunityPlatformCommentFile.ICreate,
      },
    );
  });
  TestValidator.equals(
    "original attachment id unchanged after duplicate conflict",
    firstAttachment.id,
    originalAttachmentId,
  );
  TestValidator.equals(
    "original attachment created_at unchanged after duplicate conflict",
    firstAttachment.created_at,
    originalAttachmentCreatedAt,
  );
  TestValidator.equals(
    "original attachment updated_at unchanged after duplicate conflict",
    firstAttachment.updated_at,
    originalAttachmentUpdatedAt,
  );
  TestValidator.equals(
    "original attachment original_name unchanged after duplicate conflict",
    firstAttachment.original_name,
    originalAttachmentOriginalName,
  );
  TestValidator.equals(
    "original attachment mime_type unchanged after duplicate conflict",
    firstAttachment.mime_type,
    originalAttachmentMimeType,
  );
  TestValidator.equals(
    "original attachment storage_key unchanged after duplicate conflict",
    firstAttachment.storage_key,
    originalAttachmentStorageKey,
  );
  TestValidator.equals(
    "original attachment size unchanged after duplicate conflict",
    firstAttachment.size,
    originalAttachmentSize,
  );
  await api.functional.communityPlatform.admin.posts.comments.erase(
    adminConnection,
    {
      postId: post.id,
      commentId: commentIdentity.id,
    },
  );
  await TestValidator.error(
    "deleted comment rejects new attachment",
    async () => {
      await generate_random_community_platform_admin_posts_comments_files_create(
        adminConnection,
        {
          params: {
            postId: post.id,
            commentId: commentIdentity.id,
          },
          body: {
            original_name: `after-delete-${RandomGenerator.alphaNumeric(8)}.txt`,
            mime_type: "text/plain",
            storage_key: `comment-files/${RandomGenerator.alphaNumeric(16)}`,
            size: 512 satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
          } satisfies ICommunityPlatformCommentFile.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original attachment id unchanged after deleted comment rejection",
    firstAttachment.id,
    originalAttachmentId,
  );
  TestValidator.equals(
    "original attachment created_at unchanged after deleted comment rejection",
    firstAttachment.created_at,
    originalAttachmentCreatedAt,
  );
  TestValidator.equals(
    "original attachment updated_at unchanged after deleted comment rejection",
    firstAttachment.updated_at,
    originalAttachmentUpdatedAt,
  );
  TestValidator.equals(
    "original attachment original_name unchanged after deleted comment rejection",
    firstAttachment.original_name,
    originalAttachmentOriginalName,
  );
  TestValidator.equals(
    "original attachment mime_type unchanged after deleted comment rejection",
    firstAttachment.mime_type,
    originalAttachmentMimeType,
  );
  TestValidator.equals(
    "original attachment storage_key unchanged after deleted comment rejection",
    firstAttachment.storage_key,
    originalAttachmentStorageKey,
  );
  TestValidator.equals(
    "original attachment size unchanged after deleted comment rejection",
    firstAttachment.size,
    originalAttachmentSize,
  );
}
