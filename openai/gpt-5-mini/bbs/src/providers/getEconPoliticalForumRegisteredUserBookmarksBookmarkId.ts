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

export async function getEconPoliticalForumRegisteredUserBookmarksBookmarkId(props: {
  registeredUser: RegistereduserPayload;
  bookmarkId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumBookmark> {
  const { registeredUser, bookmarkId } = props;

  try {
    const bookmark =
      await MyGlobal.prisma.econ_political_forum_bookmarks.findFirst({
        where: {
          id: bookmarkId,
          deleted_at: null,
        },
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

    if (bookmark.registereduser_id !== registeredUser.id) {
      throw new HttpException(
        "Unauthorized: You can only access your own bookmarks",
        403,
      );
    }

    return {
      id: bookmark.id as string & tags.Format<"uuid">,
      registereduser_id: bookmark.registereduser_id as string &
        tags.Format<"uuid">,
      post_id: bookmark.post_id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(bookmark.created_at),
      updated_at: toISOStringSafe(bookmark.updated_at),
      deleted_at: bookmark.deleted_at
        ? toISOStringSafe(bookmark.deleted_at)
        : null,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
