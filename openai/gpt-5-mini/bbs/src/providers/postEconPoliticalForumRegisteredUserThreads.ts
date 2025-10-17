import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function postEconPoliticalForumRegisteredUserThreads(props: {
  registeredUser: RegistereduserPayload;
  body: IEconPoliticalForumThread.ICreate;
}): Promise<IEconPoliticalForumThread> {
  const { registeredUser, body } = props;

  // Verify category exists and is active (not soft-deleted)
  const category =
    await MyGlobal.prisma.econ_political_forum_categories.findFirstOrThrow({
      where: { id: body.category_id, deleted_at: null },
      select: { id: true, requires_verification: true },
    });

  // Enforce verification gating when required by category
  if (category.requires_verification) {
    const reg =
      await MyGlobal.prisma.econ_political_forum_registereduser.findUniqueOrThrow(
        {
          where: { id: registeredUser.id },
          select: {
            id: true,
            email_verified: true,
            is_banned: true,
            deleted_at: true,
          },
        },
      );

    if (!reg.email_verified || reg.is_banned || reg.deleted_at !== null) {
      throw new HttpException(
        "Forbidden: category requires verified account",
        403,
      );
    }
  }

  // Prepare slug (use provided slug or synthesize from title)
  const makeSlug = (input: string) =>
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const baseSlug = body.slug
    ? body.slug.trim().toLowerCase()
    : makeSlug(body.title);
  let slug = baseSlug;

  const existing = await MyGlobal.prisma.econ_political_forum_threads.findFirst(
    {
      where: { slug, deleted_at: null },
      select: { id: true },
    },
  );

  if (existing) {
    if (body.slug) {
      // Client provided slug that already exists
      throw new HttpException("Conflict: slug already exists", 409);
    }
    // Synthesize unique slug by appending short uuid fragment
    slug = `${baseSlug}-${v4().split("-")[0]}`;
  }

  // Determine pinned privileges: only moderators or administrators can set pinned
  const [moderator, admin] = await Promise.all([
    MyGlobal.prisma.econ_political_forum_moderator.findFirst({
      where: {
        registereduser_id: registeredUser.id,
        deleted_at: null,
        is_active: true,
      },
      select: { id: true },
    }),
    MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: { registereduser_id: registeredUser.id, deleted_at: null },
      select: { id: true },
    }),
  ]);

  const pinned = moderator || admin ? (body.pinned ?? false) : false;
  const status = body.status ?? "open";

  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.econ_political_forum_threads.create({
    data: {
      id: newId,
      category_id: body.category_id,
      author_id: registeredUser.id,
      title: body.title,
      slug,
      status,
      pinned,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      category_id: true,
      author_id: true,
      title: true,
      slug: true,
      status: true,
      pinned: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    category_id: created.category_id as string & tags.Format<"uuid">,
    author_id: created.author_id as string & tags.Format<"uuid">,
    title: created.title,
    slug: created.slug,
    status: created.status,
    pinned: created.pinned,
    created_at: created.created_at
      ? toISOStringSafe(created.created_at)
      : toISOStringSafe(new Date()),
    updated_at: created.updated_at
      ? toISOStringSafe(created.updated_at)
      : toISOStringSafe(new Date()),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
