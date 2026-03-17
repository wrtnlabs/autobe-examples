import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import { ICommunityPlatformCommentSnapshotFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshotFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommentSnapshotFileTransformer } from "../transformers/CommunityPlatformCommentSnapshotFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminPostsPostIdCommentsCommentIdSnapshotsSnapshotIdFilesSnapshotFileId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  snapshotFileId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentSnapshotFile> {
  await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
    where: {
      id: props.commentId,
      community_platform_post_id: props.postId,
      deleted_at: null,
      post: {
        deleted_at: null,
      },
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.community_platform_comment_snapshots.findFirstOrThrow({
    where: {
      id: props.snapshotId,
      community_platform_comment_id: props.commentId,
    },
    select: {
      id: true,
    },
  });
  const snapshotFile =
    await MyGlobal.prisma.community_platform_comment_snapshot_files.findFirstOrThrow(
      {
        where: {
          id: props.snapshotFileId,
          community_platform_comment_snapshot_id: props.snapshotId,
          deleted_at: null,
        },
        ...CommunityPlatformCommentSnapshotFileTransformer.select(),
      },
    );
  return await CommunityPlatformCommentSnapshotFileTransformer.transform(
    snapshotFile,
  );
}
