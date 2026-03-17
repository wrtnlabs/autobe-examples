import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
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

export async function putCommunityPlatformMemberPostsPostIdCommentsCommentIdFilesFileId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentFile.IUpdate;
}): Promise<ICommunityPlatformCommentFile> {
  const target =
    await MyGlobal.prisma.community_platform_comment_files.findFirstOrThrow({
      where: {
        id: props.fileId,
        community_platform_comment_id: props.commentId,
        comment: {
          id: props.commentId,
          community_platform_post_id: props.postId,
        },
      },
      select: {
        id: true,
        deleted_at: true,
        comment: {
          select: {
            id: true,
            deleted_at: true,
            community_platform_member_id: true,
            post: {
              select: {
                id: true,
                deleted_at: true,
              },
            } satisfies Prisma.community_platform_postsFindManyArgs,
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
      },
    });
  if (target.comment.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (target.deleted_at !== null) {
    throw new HttpException("Attachment is unavailable", 404);
  }
  if (target.comment.deleted_at !== null) {
    throw new HttpException("Comment is unavailable", 404);
  }
  if (target.comment.post.deleted_at !== null) {
    throw new HttpException("Post is unavailable", 404);
  }
  try {
    await MyGlobal.prisma.community_platform_comment_files.update({
      where: {
        id: props.fileId,
      },
      data: {
        ...(props.body.original_name !== undefined
          ? { original_name: props.body.original_name }
          : {}),
        ...(props.body.mime_type !== undefined
          ? { mime_type: props.body.mime_type }
          : {}),
        ...(props.body.storage_key !== undefined
          ? { storage_key: props.body.storage_key }
          : {}),
        ...(props.body.size !== undefined ? { size: props.body.size } : {}),
        updated_at: new Date(),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("storage_key must be unique", 400);
    }
    throw error;
  }
  const updated =
    await MyGlobal.prisma.community_platform_comment_files.findFirstOrThrow({
      where: {
        id: props.fileId,
        community_platform_comment_id: props.commentId,
        comment: {
          id: props.commentId,
          community_platform_post_id: props.postId,
        },
      },
      select: {
        id: true,
        comment: {
          select: {},
        } satisfies Prisma.community_platform_commentsFindManyArgs,
        original_name: true,
        mime_type: true,
        storage_key: true,
        size: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: updated.id,
    comment: {} satisfies ICommunityPlatformComment.ISummary,
    original_name: updated.original_name,
    mime_type: updated.mime_type,
    storage_key: updated.storage_key,
    size: updated.size,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
    deleted_at: updated.deleted_at?.toISOString() ?? null,
  };
}
