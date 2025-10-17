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

export async function postEconPoliticalForumRegisteredUserBookmarks(props: {
  registeredUser: RegistereduserPayload;
  body: IEconPoliticalForumBookmark.ICreate;
}): Promise<IEconPoliticalForumBookmark> {
  const { registeredUser, body } = props;

  // Authorization / active account check
  const user =
    await MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
      where: { id: registeredUser.id },
      select: { id: true, is_banned: true, deleted_at: true },
    });

  if (!user || user.deleted_at !== null || user.is_banned) {
    throw new HttpException("Unauthorized", 403);
  }

  // Validate target post exists and is visible to caller
  const post = await MyGlobal.prisma.econ_political_forum_posts.findUnique({
    where: { id: body.post_id },
    include: { thread: true },
  });

  if (!post || post.deleted_at !== null || post.is_hidden) {
    throw new HttpException("Not Found", 404);
  }
  if (post.thread && post.thread.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Check existing bookmark by unique key (registereduser_id + post_id)
  const existing =
    await MyGlobal.prisma.econ_political_forum_bookmarks.findFirst({
      where: {
        registereduser_id: registeredUser.id,
        post_id: body.post_id,
      },
    });

  const now = toISOStringSafe(new Date());

  if (existing) {
    // If active, return existing (idempotent)
    if (existing.deleted_at === null) {
      return {
        id: existing.id as string & tags.Format<"uuid">,
        registereduser_id: existing.registereduser_id as string &
          tags.Format<"uuid">,
        post_id: existing.post_id as string & tags.Format<"uuid">,
        created_at: toISOStringSafe(existing.created_at),
        updated_at: toISOStringSafe(existing.updated_at),
        deleted_at: existing.deleted_at
          ? toISOStringSafe(existing.deleted_at)
          : undefined,
      };
    }

    // Restore soft-deleted bookmark
    const restored =
      await MyGlobal.prisma.econ_political_forum_bookmarks.update({
        where: { id: existing.id },
        data: {
          deleted_at: null,
          updated_at: now,
        },
      });

    return {
      id: restored.id as string & tags.Format<"uuid">,
      registereduser_id: restored.registereduser_id as string &
        tags.Format<"uuid">,
      post_id: restored.post_id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(restored.created_at),
      updated_at: toISOStringSafe(restored.updated_at),
      deleted_at: restored.deleted_at
        ? toISOStringSafe(restored.deleted_at)
        : undefined,
    };
  }

  // Create new bookmark
  const created = await MyGlobal.prisma.econ_political_forum_bookmarks.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: registeredUser.id,
      post_id: body.post_id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    registereduser_id: created.registereduser_id as string &
      tags.Format<"uuid">,
    post_id: created.post_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
