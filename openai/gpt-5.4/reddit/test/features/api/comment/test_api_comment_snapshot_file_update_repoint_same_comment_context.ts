import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_comment_snapshot_file_update_repoint_same_comment_context(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 4 }),
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
  const createdComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 5 }),
          parentId: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  const commentIdentity = typia.assert<{
    id: string & tags.Format<"uuid">;
  }>(createdComment);
  const originalFile =
    await generate_random_community_platform_member_posts_comments_files_create(
      memberConnection,
      {
        params: {
          postId: post.id,
          commentId: commentIdentity.id,
        },
        body: {
          original_name: `${RandomGenerator.alphaNumeric(8)}.txt`,
          mime_type: "text/plain",
          storage_key: `comment-files/${RandomGenerator.alphaNumeric(16)}`,
          size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
        } satisfies ICommunityPlatformCommentFile.ICreate,
      },
    );
  typia.assert(originalFile);
  const replacementFile =
    await generate_random_community_platform_member_posts_comments_files_create(
      memberConnection,
      {
        params: {
          postId: post.id,
          commentId: commentIdentity.id,
        },
        body: {
          original_name: `${RandomGenerator.alphaNumeric(8)}.txt`,
          mime_type: "text/plain",
          storage_key: `comment-files/${RandomGenerator.alphaNumeric(16)}`,
          size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
        } satisfies ICommunityPlatformCommentFile.ICreate,
      },
    );
  typia.assert(replacementFile);
  TestValidator.notEquals(
    "comment file ids differ",
    originalFile.id,
    replacementFile.id,
  );
  const snapshot =
    await api.functional.communityPlatform.member.posts.comments.snapshots.create(
      memberConnection,
      {
        postId: post.id,
        commentId: commentIdentity.id,
      },
    );
  typia.assert(snapshot);
  const snapshotFile =
    await generate_random_community_platform_member_posts_comments_snapshots_files_create(
      memberConnection,
      {
        params: {
          postId: post.id,
          commentId: commentIdentity.id,
          snapshotId: snapshot.id,
        },
        body: {
          original_name: originalFile.original_name,
          mime_type: originalFile.mime_type,
          storage_key: originalFile.storage_key,
          size: originalFile.size,
        } satisfies ICommunityPlatformCommentSnapshotFile.ICreate,
      },
    );
  typia.assert(snapshotFile);
  const updated =
    await api.functional.communityPlatform.member.posts.comments.snapshots.files.update(
      memberConnection,
      {
        postId: post.id,
        commentId: commentIdentity.id,
        snapshotId: snapshot.id,
        snapshotFileId: snapshotFile.id,
        body: {
          community_platform_comment_file_id: replacementFile.id,
        } satisfies ICommunityPlatformCommentSnapshotFile.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "snapshot file identity unchanged",
    updated.id,
    snapshotFile.id,
  );
  TestValidator.equals(
    "snapshot identity unchanged",
    updated.commentSnapshot.id,
    snapshotFile.commentSnapshot.id,
  );
  TestValidator.equals(
    "snapshot id matches parent snapshot",
    updated.commentSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "association created_at unchanged",
    updated.created_at,
    snapshotFile.created_at,
  );
  TestValidator.equals(
    "association remains in same deleted state",
    updated.deleted_at,
    snapshotFile.deleted_at,
  );
  TestValidator.equals(
    "repointed to replacement file",
    updated.commentFile.id,
    replacementFile.id,
  );
  TestValidator.notEquals(
    "linked file changed from original",
    updated.commentFile.id,
    originalFile.id,
  );
  TestValidator.notEquals(
    "updated_at changed after repoint",
    updated.updated_at,
    snapshotFile.updated_at,
  );
}
