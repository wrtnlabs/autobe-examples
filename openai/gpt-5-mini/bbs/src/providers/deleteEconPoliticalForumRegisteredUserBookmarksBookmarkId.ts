import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function deleteEconPoliticalForumRegisteredUserBookmarksBookmarkId(props: {
  registeredUser: RegistereduserPayload;
  bookmarkId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { registeredUser, bookmarkId } = props;

  // Verify bookmark exists and is not already deleted
  const bookmark =
    await MyGlobal.prisma.econ_political_forum_bookmarks.findUnique({
      where: { id: bookmarkId },
      select: {
        id: true,
        registereduser_id: true,
        post_id: true,
        deleted_at: true,
      },
    });

  if (!bookmark || bookmark.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Ownership check
  if (bookmark.registereduser_id !== registeredUser.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own bookmarks",
      403,
    );
  }

  // Retrieve post to check for thread-level legal holds
  const post = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
    where: { id: bookmark.post_id },
    select: { id: true, thread_id: true },
  });

  // Check for any active legal hold on the post or its thread
  const legalHold =
    await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
      where: {
        is_active: true,
        OR: [
          { post_id: bookmark.post_id },
          ...(post && post.thread_id ? [{ thread_id: post.thread_id }] : []),
        ],
      },
      select: { id: true },
    });

  if (legalHold) {
    throw new HttpException(
      "Forbidden: Active legal hold prevents deletion",
      403,
    );
  }

  // Perform soft-delete: set deleted_at and updated_at to the same ISO timestamp
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.econ_political_forum_bookmarks.update({
    where: { id: bookmark.id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  return;
}
