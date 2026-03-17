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
import { generate_random_community_platform_member_posts_comments_snapshots_files_create } from "../../../generate/generate_random_community_platform_member_posts_comments_snapshots_files_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_snapshot_file } from "../../../prepare/prepare_random_community_platform_comment_snapshot_file";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_comment_snapshot_file_nested_path_mismatch(
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
        },
      },
    );
  typia.assert(community);
  const firstPost =
    await generate_random_community_platform_member_posts_create(
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
  typia.assert(firstPost);
  const secondPost =
    await generate_random_community_platform_member_posts_create(
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
  typia.assert(secondPost);
  const firstComment = typia.assert<{
    id: string & tags.Format<"uuid">;
  }>(
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: firstPost.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
          parentId: null,
        },
      },
    ),
  );
  const secondComment = typia.assert<{
    id: string & tags.Format<"uuid">;
  }>(
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: secondPost.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
          parentId: null,
        },
      },
    ),
  );
  const secondSnapshot =
    await api.functional.communityPlatform.member.posts.comments.snapshots.create(
      memberConnection,
      {
        postId: secondPost.id,
        commentId: secondComment.id,
      },
    );
  typia.assert(secondSnapshot);
  const fileBody = {
    original_name: `snapshot-${RandomGenerator.alphabets(6)}.txt`,
    mime_type: "text/plain",
    storage_key: `comment-snapshot/${RandomGenerator.alphaNumeric(16)}`,
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
  } satisfies ICommunityPlatformCommentSnapshotFile.ICreate;
  await TestValidator.error("reject mismatched snapshot nesting", async () => {
    await generate_random_community_platform_member_posts_comments_snapshots_files_create(
      memberConnection,
      {
        params: {
          postId: firstPost.id,
          commentId: firstComment.id,
          snapshotId: secondSnapshot.id,
        },
        body: fileBody,
      },
    );
  });
  const validAssociation =
    await generate_random_community_platform_member_posts_comments_snapshots_files_create(
      memberConnection,
      {
        params: {
          postId: secondPost.id,
          commentId: secondComment.id,
          snapshotId: secondSnapshot.id,
        },
        body: fileBody,
      },
    );
  typia.assert(validAssociation);
  TestValidator.equals(
    "association created on intended snapshot",
    validAssociation.commentSnapshot.id,
    secondSnapshot.id,
  );
  TestValidator.equals(
    "attached file original name preserved",
    validAssociation.commentFile.original_name,
    fileBody.original_name,
  );
  TestValidator.equals(
    "attached file mime type preserved",
    validAssociation.commentFile.mime_type,
    fileBody.mime_type,
  );
  TestValidator.equals(
    "attached file storage key preserved",
    validAssociation.commentFile.storage_key,
    fileBody.storage_key,
  );
  TestValidator.equals(
    "attached file size preserved",
    validAssociation.commentFile.size,
    fileBody.size,
  );
}
