import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserCommentBookmarksCommentBookmarkId(props: {
  user: UserPayload;
  commentBookmarkId: string & tags.Format<"uuid">;
}): Promise<void> {
  const bookmark =
    await MyGlobal.prisma.community_platform_comment_bookmarks.findUnique({
      where: { id: props.commentBookmarkId },
      select: { id: true, user_id: true },
    });
  if (!bookmark) {
    throw new HttpException("Comment bookmark not found", 404);
  }
  // Only the owner can delete their bookmark. 'user' is not admin, so check ownership only.
  if (bookmark.user_id !== props.user.id) {
    throw new HttpException(
      "You are not authorized to remove this bookmark.",
      403,
    );
  }
  await MyGlobal.prisma.community_platform_comment_bookmarks.delete({
    where: { id: props.commentBookmarkId },
  });
}
