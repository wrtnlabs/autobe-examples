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

export async function putEconPoliticalForumRegisteredUserThreadsThreadId(props: {
  registeredUser: RegistereduserPayload;
  threadId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumThread.IUpdate;
}): Promise<IEconPoliticalForumThread> {
  const { registeredUser, threadId, body } = props;

  // Load thread ensuring it's not soft-deleted
  const thread = await MyGlobal.prisma.econ_political_forum_threads.findFirst({
    where: { id: threadId, deleted_at: null },
  });
  if (!thread) throw new HttpException("Not Found", 404);

  // Check legal hold
  const legalHold =
    await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
      where: { thread_id: threadId, is_active: true },
    });
  if (legalHold) throw new HttpException("Resource is under legal hold", 423);

  // Determine roles
  const isOwner = thread.author_id === registeredUser.id;
  const moderator =
    await MyGlobal.prisma.econ_political_forum_moderator.findFirst({
      where: {
        registereduser_id: registeredUser.id,
        deleted_at: null,
        is_active: true,
      },
    });
  const administrator =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: { registereduser_id: registeredUser.id, deleted_at: null },
    });
  const isPrivileged = Boolean(moderator || administrator);

  // Authorization: must be owner or privileged
  if (!isOwner && !isPrivileged) throw new HttpException("Unauthorized", 403);

  // Business validations
  if (
    body.title !== undefined &&
    (body.title.length < 5 || body.title.length > 200)
  ) {
    throw new HttpException("Title must be between 5 and 200 characters", 400);
  }

  if (body.slug !== undefined) {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(body.slug) || body.slug.length > 200) {
      throw new HttpException("Invalid slug format", 400);
    }
    const existing =
      await MyGlobal.prisma.econ_political_forum_threads.findFirst({
        where: { slug: body.slug, deleted_at: null, NOT: { id: threadId } },
      });
    if (existing) throw new HttpException("Slug conflict", 409);
  }

  const allowedStatuses = ["open", "closed", "pinned"];
  if (body.status !== undefined && !allowedStatuses.includes(body.status)) {
    throw new HttpException("Invalid status value", 400);
  }

  // Privileged-only fields
  if (body.pinned !== undefined && !isPrivileged) {
    throw new HttpException(
      "Forbidden: pinned flag can only be set by moderators/administrators",
      403,
    );
  }
  if (body.category_id !== undefined && !isPrivileged) {
    throw new HttpException(
      "Forbidden: category changes require moderator/administrator",
      403,
    );
  }

  // Prepare timestamp
  const now = toISOStringSafe(new Date());

  // Perform update inline
  const updated = await MyGlobal.prisma.econ_political_forum_threads.update({
    where: { id: threadId },
    data: {
      ...(body.category_id !== undefined && { category_id: body.category_id }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.pinned !== undefined && { pinned: body.pinned }),
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    category_id: updated.category_id as string & tags.Format<"uuid">,
    author_id: updated.author_id as string & tags.Format<"uuid">,
    title: updated.title,
    slug: updated.slug,
    status: updated.status,
    pinned: updated.pinned,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
