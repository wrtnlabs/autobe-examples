import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import type { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import type { ICommunityPlatformCommentSnapshotFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshotFile";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_files_create } from "../../../generate/generate_random_community_platform_member_posts_comments_files_create";
import { generate_random_community_platform_member_posts_comments_snapshots_files_create } from "../../../generate/generate_random_community_platform_member_posts_comments_snapshots_files_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_file } from "../../../prepare/prepare_random_community_platform_comment_file";
import { prepare_random_community_platform_comment_snapshot_file } from "../../../prepare/prepare_random_community_platform_comment_snapshot_file";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_comment_snapshot_file_update_reassign_same_comment_file(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
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
  const commentEntity = typia.assert<{
    id: string & tags.Format<"uuid">;
  }>(comment);
  const firstCommentFile =
    await generate_random_community_platform_member_posts_comments_files_create(
      memberConnection,
      {
        params: {
          postId: post.id,
          commentId: commentEntity.id,
        },
        body: {
          original_name: `${RandomGenerator.alphaNumeric(8)}.txt`,
          mime_type: "text/plain",
          storage_key: `comment-files/${RandomGenerator.alphaNumeric(16)}`,
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<1048576>
          >(),
        } satisfies ICommunityPlatformCommentFile.ICreate,
      },
    );
  typia.assert(firstCommentFile);
  const snapshot =
    await api.functional.communityPlatform.member.posts.comments.snapshots.create(
      memberConnection,
      {
        postId: post.id,
        commentId: commentEntity.id,
      },
    );
  typia.assert(snapshot);
  const originalSnapshotFile =
    await generate_random_community_platform_member_posts_comments_snapshots_files_create(
      memberConnection,
      {
        params: {
          postId: post.id,
          commentId: commentEntity.id,
          snapshotId: snapshot.id,
        },
        body: {
          original_name: firstCommentFile.original_name,
          mime_type: firstCommentFile.mime_type,
          storage_key: firstCommentFile.storage_key,
          size: firstCommentFile.size,
        } satisfies ICommunityPlatformCommentSnapshotFile.ICreate,
      },
    );
  typia.assert(originalSnapshotFile);
  const secondCommentFile =
    await generate_random_community_platform_member_posts_comments_files_create(
      memberConnection,
      {
        params: {
          postId: post.id,
          commentId: commentEntity.id,
        },
        body: {
          original_name: `${RandomGenerator.alphaNumeric(8)}.png`,
          mime_type: "image/png",
          storage_key: `comment-files/${RandomGenerator.alphaNumeric(16)}`,
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<1048576>
          >(),
        } satisfies ICommunityPlatformCommentFile.ICreate,
      },
    );
  typia.assert(secondCommentFile);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const updatedSnapshotFile =
    await api.functional.communityPlatform.admin.posts.comments.snapshots.files.update(
      adminConnection,
      {
        postId: post.id,
        commentId: commentEntity.id,
        snapshotId: snapshot.id,
        snapshotFileId: originalSnapshotFile.id,
        body: {
          community_platform_comment_file_id: secondCommentFile.id,
        } satisfies ICommunityPlatformCommentSnapshotFile.IUpdate,
      },
    );
  typia.assert(updatedSnapshotFile);
  TestValidator.equals(
    "snapshot-file resource identity remains the same",
    updatedSnapshotFile.id,
    originalSnapshotFile.id,
  );
  TestValidator.equals(
    "snapshot identity remains stable",
    updatedSnapshotFile.commentSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "linked file is reassigned to second comment file",
    updatedSnapshotFile.commentFile.id,
    secondCommentFile.id,
  );
  TestValidator.equals(
    "linked file original name matches replacement file",
    updatedSnapshotFile.commentFile.original_name,
    secondCommentFile.original_name,
  );
  TestValidator.equals(
    "linked file mime type matches replacement file",
    updatedSnapshotFile.commentFile.mime_type,
    secondCommentFile.mime_type,
  );
  TestValidator.equals(
    "linked file storage key matches replacement file",
    updatedSnapshotFile.commentFile.storage_key,
    secondCommentFile.storage_key,
  );
  TestValidator.equals(
    "linked file size matches replacement file",
    updatedSnapshotFile.commentFile.size,
    secondCommentFile.size,
  );
  TestValidator.equals(
    "association creation timestamp is preserved",
    updatedSnapshotFile.created_at,
    originalSnapshotFile.created_at,
  );
  TestValidator.notEquals(
    "association updated timestamp changes after reassignment",
    updatedSnapshotFile.updated_at,
    originalSnapshotFile.updated_at,
  );
  TestValidator.equals(
    "association deletion state remains unchanged",
    updatedSnapshotFile.deleted_at,
    originalSnapshotFile.deleted_at,
  );
}
