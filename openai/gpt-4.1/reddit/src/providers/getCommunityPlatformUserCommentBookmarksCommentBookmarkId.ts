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

export async function getCommunityPlatformUserCommentBookmarksCommentBookmarkId(props: {
  user: UserPayload;
  commentBookmarkId: string & tags.Format<"uuid">;
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
      "You are not authorized to view this bookmark.",
      403,
    );
  }

  return {
    id: bookmark.id,
    user_id: bookmark.user_id,
    comment_id: bookmark.comment_id,
    created_at: toISOStringSafe(bookmark.created_at),
    updated_at: toISOStringSafe(bookmark.updated_at),
    deleted_at:
      bookmark.deleted_at === null || bookmark.deleted_at === undefined
        ? undefined
        : toISOStringSafe(bookmark.deleted_at),
  };
}
