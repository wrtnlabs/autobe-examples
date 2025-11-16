import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentBookmark";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserCommentBookmarksCommentBookmarkId(props: {
  user: UserPayload;
  commentBookmarkId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentBookmark.IUpdate;
}): Promise<ICommunityPlatformCommentBookmark> {
  const bookmark =
    await MyGlobal.prisma.community_platform_comment_bookmarks.findUnique({
      where: { id: props.commentBookmarkId },
    });
  if (!bookmark) {
    throw new HttpException("Comment bookmark not found.", 404);
  }
  if (bookmark.user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to update this bookmark.",
      403,
    );
  }
  const now = toISOStringSafe(new Date());
  const deletedAt = Object.prototype.hasOwnProperty.call(
    props.body,
    "deleted_at",
  )
    ? (props.body.deleted_at ?? null)
    : bookmark.deleted_at;
  const updated =
    await MyGlobal.prisma.community_platform_comment_bookmarks.update({
      where: { id: props.commentBookmarkId },
      data: {
        deleted_at: deletedAt,
        updated_at: now,
      },
    });
  return {
    id: updated.id,
    user_id: updated.user_id,
    comment_id: updated.comment_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "string"
        ? updated.deleted_at
        : updated.deleted_at == null
          ? undefined
          : String(updated.deleted_at),
  };
}
