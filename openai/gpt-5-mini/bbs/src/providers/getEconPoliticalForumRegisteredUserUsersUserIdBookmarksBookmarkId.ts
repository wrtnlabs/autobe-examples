import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumBookmark";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function getEconPoliticalForumRegisteredUserUsersUserIdBookmarksBookmarkId(props: {
  registeredUser: RegistereduserPayload;
  userId: string & tags.Format<"uuid">;
  bookmarkId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumBookmark> {
  const { registeredUser, userId, bookmarkId } = props;

  if (!registeredUser) {
    throw new HttpException("Unauthorized", 401);
  }

  if (registeredUser.id !== userId) {
    throw new HttpException("Forbidden", 403);
  }

  const bookmark =
    await MyGlobal.prisma.econ_political_forum_bookmarks.findUnique({
      where: { id: bookmarkId },
      select: {
        id: true,
        registereduser_id: true,
        post_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!bookmark) {
    throw new HttpException("Not Found", 404);
  }

  if (bookmark.registereduser_id !== userId) {
    throw new HttpException("Not Found", 404);
  }

  if (bookmark.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  const post = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
    where: { id: bookmark.post_id },
    select: { id: true, is_hidden: true },
  });

  if (!post) {
    throw new HttpException("Not Found", 404);
  }

  if (post.is_hidden === true) {
    throw new HttpException("Forbidden: referenced post is hidden", 403);
  }

  const response = {
    id: bookmark.id,
    registereduser_id: bookmark.registereduser_id,
    post_id: bookmark.post_id,
    created_at: toISOStringSafe(bookmark.created_at),
    updated_at: toISOStringSafe(bookmark.updated_at),
    deleted_at: bookmark.deleted_at
      ? toISOStringSafe(bookmark.deleted_at)
      : null,
  } satisfies IEconPoliticalForumBookmark;

  return response;
}
