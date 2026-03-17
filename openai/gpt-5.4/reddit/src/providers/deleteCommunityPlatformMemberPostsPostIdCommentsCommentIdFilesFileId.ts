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

export async function deleteCommunityPlatformMemberPostsPostIdCommentsCommentIdFilesFileId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  const file =
    await MyGlobal.prisma.community_platform_comment_files.findUnique({
      where: {
        id: props.fileId,
      },
      select: {
        id: true,
        storage_key: true,
        deleted_at: true,
        comment: {
          select: {
            id: true,
            community_platform_post_id: true,
            community_platform_member_id: true,
            deleted_at: true,
            post: {
              select: {
                community_platform_community_id: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  if (
    file === null ||
    file.deleted_at !== null ||
    file.comment.id !== props.commentId ||
    file.comment.deleted_at !== null ||
    file.comment.community_platform_post_id !== props.postId ||
    file.comment.post.deleted_at !== null
  ) {
    throw new HttpException("Not Found", 404);
  }
  if (file.comment.community_platform_member_id !== props.member.id) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_community_id:
            file.comment.post.community_platform_community_id,
          community_platform_member_id: props.member.id,
          status: "active",
          deleted_at: null,
          revoked_at: null,
        },
        select: {
          id: true,
        },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.community_platform_comment_files.delete({
    where: {
      id: props.fileId,
    },
  });
}
