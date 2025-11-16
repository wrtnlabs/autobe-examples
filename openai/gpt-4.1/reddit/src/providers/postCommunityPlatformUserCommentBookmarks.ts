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

export async function postCommunityPlatformUserCommentBookmarks(props: {
  user: UserPayload;
  body: ICommunityPlatformCommentBookmark.ICreate;
}): Promise<ICommunityPlatformCommentBookmark> {
  // 1. Confirm comment exists and active
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.body.comment_id },
    select: { id: true, deleted_at: true },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment does not exist or is deleted.", 404);
  }

  // 2. Check for existing bookmark for this user and comment
  const existing =
    await MyGlobal.prisma.community_platform_comment_bookmarks.findUnique({
      where: {
        user_id_comment_id: {
          user_id: props.user.id,
          comment_id: props.body.comment_id,
        },
      },
    });

  const now = toISOStringSafe(new Date());

  // 3. If found and soft-deleted, restore
  if (existing) {
    if (existing.deleted_at === null) {
      throw new HttpException("Bookmark already exists.", 400);
    }
    const restored =
      await MyGlobal.prisma.community_platform_comment_bookmarks.update({
        where: {
          user_id_comment_id: {
            user_id: props.user.id,
            comment_id: props.body.comment_id,
          },
        },
        data: {
          deleted_at: null,
          updated_at: now,
        },
      });
    return {
      id: restored.id,
      user_id: restored.user_id,
      comment_id: restored.comment_id,
      created_at: toISOStringSafe(restored.created_at),
      updated_at: toISOStringSafe(restored.updated_at),
      deleted_at:
        restored.deleted_at !== null
          ? toISOStringSafe(restored.deleted_at)
          : null,
    };
  }
  // 4. Otherwise, insert new
  try {
    const created =
      await MyGlobal.prisma.community_platform_comment_bookmarks.create({
        data: {
          id: v4(),
          user_id: props.user.id,
          comment_id: props.body.comment_id,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    return {
      id: created.id,
      user_id: created.user_id,
      comment_id: created.comment_id,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== null
          ? toISOStringSafe(created.deleted_at)
          : null,
    };
  } catch (err) {
    throw new HttpException(
      "Could not create bookmark (possibly already exists).",
      400,
    );
  }
}
