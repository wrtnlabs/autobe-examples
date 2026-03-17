import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import type { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import type { ICommunityPlatformCommentSnapshotFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshotFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment_snapshot_file } from "../prepare/prepare_random_community_platform_comment_snapshot_file";

export async function generate_random_community_platform_member_posts_comments_snapshots_files_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformCommentSnapshotFile.ICreate>
      | undefined;
    params: {
      postId: string;
      commentId: string;
      snapshotId: string;
    };
  },
): Promise<ICommunityPlatformCommentSnapshotFile> {
  const prepared: ICommunityPlatformCommentSnapshotFile.ICreate =
    prepare_random_community_platform_comment_snapshot_file(props.body);
  const result: ICommunityPlatformCommentSnapshotFile =
    await api.functional.communityPlatform.member.posts.comments.snapshots.files.create(
      connection,
      {
        body: prepared,
        postId: props.params.postId,
        commentId: props.params.commentId,
        snapshotId: props.params.snapshotId,
      },
    );
  return result;
}
