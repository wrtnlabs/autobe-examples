import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentIdSnapshotsSnapshotIdFilesSnapshotFileId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  snapshotFileId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const snapshotFile =
      await prisma.community_platform_comment_snapshot_files.findFirstOrThrow({
        where: {
          id: props.snapshotFileId,
          deleted_at: null,
        },
        select: {
          id: true,
          community_platform_comment_snapshot_id: true,
        },
      });
    if (
      snapshotFile.community_platform_comment_snapshot_id !== props.snapshotId
    ) {
      throw new HttpException("Not Found", 404);
    }
    const snapshot =
      await prisma.community_platform_comment_snapshots.findUniqueOrThrow({
        where: {
          id: props.snapshotId,
        },
        select: {
          id: true,
          community_platform_comment_id: true,
        },
      });
    if (snapshot.community_platform_comment_id !== props.commentId) {
      throw new HttpException("Not Found", 404);
    }
    const comment = await prisma.community_platform_comments.findFirstOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_platform_post_id: true,
        community_platform_member_id: true,
      },
    });
    if (comment.community_platform_post_id !== props.postId) {
      throw new HttpException("Not Found", 404);
    }
    const post = await prisma.community_platform_posts.findFirstOrThrow({
      where: {
        id: props.postId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_platform_community_id: true,
      },
    });
    if (comment.community_platform_member_id !== props.member.id) {
      const moderator =
        await prisma.community_platform_community_moderators.findFirst({
          where: {
            community_platform_community_id:
              post.community_platform_community_id,
            community_platform_member_id: props.member.id,
            status: "active",
            revoked_at: null,
            deleted_at: null,
          },
          select: {
            id: true,
          },
        });
      if (moderator === null) {
        throw new HttpException("Forbidden", 403);
      }
    }
    const now = new Date();
    const result =
      await prisma.community_platform_comment_snapshot_files.updateMany({
        where: {
          id: props.snapshotFileId,
          community_platform_comment_snapshot_id: props.snapshotId,
          deleted_at: null,
        },
        data: {
          updated_at: now,
          deleted_at: now,
        },
      });
    if (result.count === 0) {
      throw new HttpException("Not Found", 404);
    }
  });
}
