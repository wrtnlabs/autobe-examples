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
import { generate_random_community_platform_member_posts_comments_snapshots_files_create } from "../../../generate/generate_random_community_platform_member_posts_comments_snapshots_files_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_snapshot_file } from "../../../prepare/prepare_random_community_platform_comment_snapshot_file";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_comment_snapshot_file_chain_mismatch_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(
    16,
  ) satisfies string as string & tags.Format<"password">;
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_platform_community_id: community.id,
        post_type: "text",
        textContent: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPostText.ICreate,
      },
    },
  );
  typia.assert<ICommunityPlatformPost>(post);
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parentId: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);
  const snapshotOne =
    await api.functional.communityPlatform.member.posts.comments.snapshots.create(
      memberConnection,
      {
        postId: post.id,
        commentId,
      },
    );
  typia.assert<ICommunityPlatformCommentSnapshot>(snapshotOne);
  const snapshotTwo =
    await api.functional.communityPlatform.member.posts.comments.snapshots.create(
      memberConnection,
      {
        postId: post.id,
        commentId,
      },
    );
  typia.assert<ICommunityPlatformCommentSnapshot>(snapshotTwo);
  const snapshotFileOne =
    await generate_random_community_platform_member_posts_comments_snapshots_files_create(
      memberConnection,
      {
        params: {
          postId: post.id,
          commentId,
          snapshotId: snapshotOne.id,
        },
        body: {
          original_name: `file-${RandomGenerator.alphaNumeric(8)}.txt`,
          mime_type: "text/plain",
          storage_key: `snapshot-one-${RandomGenerator.alphaNumeric(16)}`,
          size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number & tags.Type<"int32">,
        } satisfies ICommunityPlatformCommentSnapshotFile.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommentSnapshotFile>(snapshotFileOne);
  const snapshotFileTwo =
    await generate_random_community_platform_member_posts_comments_snapshots_files_create(
      memberConnection,
      {
        params: {
          postId: post.id,
          commentId,
          snapshotId: snapshotTwo.id,
        },
        body: {
          original_name: `file-${RandomGenerator.alphaNumeric(8)}.txt`,
          mime_type: "text/plain",
          storage_key: `snapshot-two-${RandomGenerator.alphaNumeric(16)}`,
          size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number & tags.Type<"int32">,
        } satisfies ICommunityPlatformCommentSnapshotFile.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommentSnapshotFile>(snapshotFileTwo);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(
    16,
  ) satisfies string as string & tags.Format<"password">;
  await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  await TestValidator.httpError(
    "mismatched snapshot file chain returns not found",
    404,
    async () => {
      await api.functional.communityPlatform.admin.posts.comments.snapshots.files.at(
        adminConnection,
        {
          postId: post.id,
          commentId,
          snapshotId: snapshotOne.id,
          snapshotFileId: snapshotFileTwo.id,
        },
      );
    },
  );
}
