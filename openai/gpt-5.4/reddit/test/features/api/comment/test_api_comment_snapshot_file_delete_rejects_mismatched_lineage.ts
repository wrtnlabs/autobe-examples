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

export async function test_api_comment_snapshot_file_delete_rejects_mismatched_lineage(
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
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const postA = await generate_random_community_platform_member_posts_create(
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
  typia.assert(postA);
  const postB = await generate_random_community_platform_member_posts_create(
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
  typia.assert(postB);
  const commentA =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: postA.id,
        },
        body: {
          body: RandomGenerator.content({ paragraphs: 1 }),
          parentId: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(commentA);
  const commentAWithId = typia.assert<{
    id: string & tags.Format<"uuid">;
  }>(commentA);
  const commentB =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: postB.id,
        },
        body: {
          body: RandomGenerator.content({ paragraphs: 1 }),
          parentId: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(commentB);
  const commentBWithId = typia.assert<{
    id: string & tags.Format<"uuid">;
  }>(commentB);
  const snapshotA =
    await api.functional.communityPlatform.member.posts.comments.snapshots.create(
      memberConnection,
      {
        postId: postA.id,
        commentId: commentAWithId.id,
      },
    );
  typia.assert(snapshotA);
  const snapshotB =
    await api.functional.communityPlatform.member.posts.comments.snapshots.create(
      memberConnection,
      {
        postId: postB.id,
        commentId: commentBWithId.id,
      },
    );
  typia.assert(snapshotB);
  const snapshotFileA =
    await generate_random_community_platform_member_posts_comments_snapshots_files_create(
      memberConnection,
      {
        params: {
          postId: postA.id,
          commentId: commentAWithId.id,
          snapshotId: snapshotA.id,
        },
        body: {
          original_name: `file-${RandomGenerator.alphabets(6)}.txt`,
          mime_type: "text/plain",
          storage_key: `comment-snapshot/${RandomGenerator.alphaNumeric(16)}`,
          size: (Math.abs(typia.random<number & tags.Type<"int32">>()) ||
            1) satisfies number as number,
        } satisfies ICommunityPlatformCommentSnapshotFile.ICreate,
      },
    );
  typia.assert(snapshotFileA);
  const snapshotFileB =
    await generate_random_community_platform_member_posts_comments_snapshots_files_create(
      memberConnection,
      {
        params: {
          postId: postB.id,
          commentId: commentBWithId.id,
          snapshotId: snapshotB.id,
        },
        body: {
          original_name: `file-${RandomGenerator.alphabets(6)}.txt`,
          mime_type: "text/plain",
          storage_key: `comment-snapshot/${RandomGenerator.alphaNumeric(16)}`,
          size: (Math.abs(typia.random<number & tags.Type<"int32">>()) ||
            1) satisfies number as number,
        } satisfies ICommunityPlatformCommentSnapshotFile.ICreate,
      },
    );
  typia.assert(snapshotFileB);
  await TestValidator.httpError(
    "rejects snapshot file deletion with mismatched lineage",
    404,
    async () => {
      await api.functional.communityPlatform.member.posts.comments.snapshots.files.erase(
        memberConnection,
        {
          postId: postB.id,
          commentId: commentBWithId.id,
          snapshotId: snapshotB.id,
          snapshotFileId: snapshotFileA.id,
        },
      );
    },
  );
  await api.functional.communityPlatform.member.posts.comments.snapshots.files.erase(
    memberConnection,
    {
      postId: postA.id,
      commentId: commentAWithId.id,
      snapshotId: snapshotA.id,
      snapshotFileId: snapshotFileA.id,
    },
  );
  await api.functional.communityPlatform.member.posts.comments.snapshots.files.erase(
    memberConnection,
    {
      postId: postB.id,
      commentId: commentBWithId.id,
      snapshotId: snapshotB.id,
      snapshotFileId: snapshotFileB.id,
    },
  );
}
