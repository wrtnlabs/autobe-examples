import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformAdminPostsPostIdCommentsCommentIdSnapshotsSnapshotIdFilesSnapshotFileId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  snapshotFileId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const snapshotFile =
      await prisma.community_platform_comment_snapshot_files.findUniqueOrThrow({
        where: {
          id: props.snapshotFileId,
        },
        select: {
          id: true,
          deleted_at: true,
          commentSnapshot: {
            select: {
              id: true,
              community_platform_comment_id: true,
              comment: {
                select: {
                  id: true,
                  community_platform_post_id: true,
                  post: {
                    select: {
                      id: true,
                      community_platform_community_id: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    if (snapshotFile.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    if (snapshotFile.commentSnapshot.id !== props.snapshotId) {
      throw new HttpException("Not Found", 404);
    }
    if (
      snapshotFile.commentSnapshot.community_platform_comment_id !==
      props.commentId
    ) {
      throw new HttpException("Not Found", 404);
    }
    if (snapshotFile.commentSnapshot.comment.id !== props.commentId) {
      throw new HttpException("Not Found", 404);
    }
    if (
      snapshotFile.commentSnapshot.comment.community_platform_post_id !==
      props.postId
    ) {
      throw new HttpException("Not Found", 404);
    }
    if (snapshotFile.commentSnapshot.comment.post.id !== props.postId) {
      throw new HttpException("Not Found", 404);
    }
    props.admin;
    throw new HttpException("Forbidden", 403);
  });
}
