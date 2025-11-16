import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostBookmark";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserPostBookmarksPostBookmarkId(props: {
  user: UserPayload;
  postBookmarkId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostBookmark> {
  const existing =
    await MyGlobal.prisma.community_platform_post_bookmarks.findUnique({
      where: { id: props.postBookmarkId },
    });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Bookmark not found.", 404);
  }
  if (existing.user_id !== props.user.id) {
    throw new HttpException("Forbidden.", 403);
  }
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.community_platform_post_bookmarks.update({
      where: { id: props.postBookmarkId },
      data: { deleted_at: now, updated_at: now },
    });
  return {
    id: updated.id,
    user_id: updated.user_id,
    post_id: updated.post_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
