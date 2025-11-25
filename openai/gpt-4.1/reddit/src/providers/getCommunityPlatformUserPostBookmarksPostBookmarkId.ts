import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostBookmark";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserPostBookmarksPostBookmarkId(props: {
  user: UserPayload;
  postBookmarkId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostBookmark> {
  const bookmark =
    await MyGlobal.prisma.community_platform_post_bookmarks.findFirst({
      where: {
        id: props.postBookmarkId,
        user_id: props.user.id,
      },
    });

  if (!bookmark) {
    throw new HttpException(
      "The requested post bookmark does not exist or does not belong to this user.",
      404,
    );
  }

  return {
    id: bookmark.id,
    user_id: bookmark.user_id,
    post_id: bookmark.post_id,
    created_at: toISOStringSafe(bookmark.created_at),
    updated_at: toISOStringSafe(bookmark.updated_at),
    ...(bookmark.deleted_at !== null && bookmark.deleted_at !== undefined
      ? { deleted_at: toISOStringSafe(bookmark.deleted_at) }
      : {}),
  };
}
