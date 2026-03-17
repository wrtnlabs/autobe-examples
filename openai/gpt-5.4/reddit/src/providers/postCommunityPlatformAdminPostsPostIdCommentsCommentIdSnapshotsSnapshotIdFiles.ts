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
import { CommunityPlatformCommentSnapshotFileCollector } from "../collectors/CommunityPlatformCommentSnapshotFileCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommentSnapshotFileTransformer } from "../transformers/CommunityPlatformCommentSnapshotFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminPostsPostIdCommentsCommentIdSnapshotsSnapshotIdFiles(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentSnapshotFile.ICreate;
}): Promise<ICommunityPlatformCommentSnapshotFile> {
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  await MyGlobal.prisma.community_platform_comments.findFirstOrThrow({
    where: {
      id: props.commentId,
      community_platform_post_id: props.postId,
    },
    select: { id: true },
  });
  const snapshot =
    await MyGlobal.prisma.community_platform_comment_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          community_platform_comment_id: props.commentId,
        },
        select: { id: true },
      },
    );
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const existingFile =
      await prisma.community_platform_comment_files.findUnique({
        where: {
          storage_key: props.body.storage_key,
        },
        select: { id: true },
      });
    if (existingFile !== null) {
      const duplicated =
        await prisma.community_platform_comment_snapshot_files.findFirst({
          where: {
            community_platform_comment_snapshot_id: snapshot.id,
            community_platform_comment_file_id: existingFile.id,
          },
          select: { id: true },
        });
      if (duplicated !== null) {
        throw new HttpException("Conflict", 409);
      }
    }
    const created =
      await prisma.community_platform_comment_snapshot_files.create({
        data: await CommunityPlatformCommentSnapshotFileCollector.collect({
          body: props.body,
          communityPlatformCommentSnapshots: {
            id: snapshot.id,
          },
        }),
        ...CommunityPlatformCommentSnapshotFileTransformer.select(),
      });
    return await CommunityPlatformCommentSnapshotFileTransformer.transform(
      created,
    );
  });
}
