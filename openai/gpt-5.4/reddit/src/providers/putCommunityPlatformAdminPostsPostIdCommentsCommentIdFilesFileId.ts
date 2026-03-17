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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminPostsPostIdCommentsCommentIdFilesFileId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentFile.IUpdate;
}): Promise<ICommunityPlatformCommentFile> {
  const target =
    await MyGlobal.prisma.community_platform_comment_files.findUniqueOrThrow({
      where: {
        id: props.fileId,
      },
      select: {
        id: true,
        community_platform_comment_id: true,
        deleted_at: true,
        comment: {
          select: {
            id: true,
            community_platform_post_id: true,
            deleted_at: true,
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
      },
    });
  if (
    target.community_platform_comment_id !== props.commentId ||
    target.comment.id !== props.commentId ||
    target.comment.community_platform_post_id !== props.postId
  ) {
    throw new HttpException("Not Found", 404);
  }
  if (target.deleted_at !== null || target.comment.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (props.admin.id.length > 0 && props.body !== null) {
    throw new HttpException("Forbidden", 403);
  }
  throw new HttpException("Forbidden", 403);
}
