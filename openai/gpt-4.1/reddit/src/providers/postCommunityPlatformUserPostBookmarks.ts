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

export async function postCommunityPlatformUserPostBookmarks(props: {
  user: UserPayload;
  body: ICommunityPlatformPostBookmark.ICreate;
}): Promise<ICommunityPlatformPostBookmark> {
  // Check for an existing bookmark (including soft-deleted) for this user and post
  const existing =
    await MyGlobal.prisma.community_platform_post_bookmarks.findFirst({
      where: {
        user_id: props.user.id,
        post_id: props.body.post_id,
      },
    });

  const now = toISOStringSafe(new Date());

  // If bookmark already exists and is active, throw duplicate error
  if (existing && existing.deleted_at === null) {
    throw new HttpException("You have already bookmarked this post.", 409);
  }

  // If bookmark exists and is soft-deleted, restore it
  if (existing && existing.deleted_at !== null) {
    const updated =
      await MyGlobal.prisma.community_platform_post_bookmarks.update({
        where: { id: existing.id },
        data: {
          deleted_at: null,
          updated_at: now,
        },
      });
    return {
      id: updated.id,
      user_id: updated.user_id,
      post_id: updated.post_id,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at !== null && updated.deleted_at !== undefined
          ? toISOStringSafe(updated.deleted_at)
          : undefined,
    };
  }

  // If not found, create new bookmark row
  const created =
    await MyGlobal.prisma.community_platform_post_bookmarks.create({
      data: {
        id: v4(),
        user_id: props.user.id,
        post_id: props.body.post_id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    user_id: created.user_id,
    post_id: created.post_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
