import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotification";
import { IPageIEconPoliticalForumNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumNotification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function patchEconPoliticalForumRegisteredUserUsersUserIdNotifications(props: {
  registeredUser: RegistereduserPayload;
  userId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumNotification.IRequest;
}): Promise<IPageIEconPoliticalForumNotification.ISummary> {
  const { registeredUser, userId, body } = props;

  // Authorization: only owner may access (no admin payload provided)
  if (registeredUser.id !== userId) {
    throw new HttpException("Forbidden", 403);
  }

  // Pagination defaults and limits
  const page = body.page ?? 1;
  const limitRequested = body.limit ?? 20;
  const limit = Math.min(Number(limitRequested), 100);
  const skip = (Number(page) - 1) * Number(limit);

  // Build where condition
  const where: any = {
    registereduser_id: userId,
    deleted_at: null,
  };

  if (body.is_read !== undefined) where.is_read = body.is_read;
  if (body.type !== undefined && body.type !== null) where.type = body.type;
  if (body.related_thread_id !== undefined && body.related_thread_id !== null)
    where.related_thread_id = body.related_thread_id;
  if (body.related_post_id !== undefined && body.related_post_id !== null)
    where.related_post_id = body.related_post_id;

  // Date range filters
  if (
    (body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
  ) {
    const createdAt: any = {};
    if (body.created_from !== undefined && body.created_from !== null)
      createdAt.gte = toISOStringSafe(body.created_from);
    if (body.created_to !== undefined && body.created_to !== null)
      createdAt.lte = toISOStringSafe(body.created_to);
    where.created_at = createdAt;
  }

  // Full-text basic search on title/body/payload when q provided
  if (body.q !== undefined && body.q !== null && body.q.length > 0) {
    where.OR = [
      { title: { contains: body.q } },
      { body: { contains: body.q } },
      { payload: { contains: body.q } },
    ];
  }

  // Determine SortOrder literal to satisfy Prisma types
  const sortOrder = (body.order === "asc" ? "asc" : "desc") as Prisma.SortOrder;

  // Order by handling (use explicit SortOrder assertions)
  const orderBy =
    body.sort_by === "oldest"
      ? { created_at: "asc" as Prisma.SortOrder }
      : body.sort_by === "unread_first"
        ? [{ is_read: "asc" as Prisma.SortOrder }, { created_at: sortOrder }]
        : // newest or default
          { created_at: sortOrder };

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_notifications.findMany({
        where,
        orderBy,
        skip: skip,
        take: limit,
        select: {
          id: true,
          registereduser_id: true,
          actor_registereduser_id: true,
          type: true,
          title: true,
          body: true,
          is_read: true,
          delivered_at: true,
          created_at: true,
          related_thread_id: true,
          related_post_id: true,
          related_moderation_case_id: true,
        },
      }),
      MyGlobal.prisma.econ_political_forum_notifications.count({ where }),
    ]);

    const data = rows.map((r) => {
      return {
        id: r.id,
        registereduser_id: r.registereduser_id,
        actor_registereduser_id: r.actor_registereduser_id ?? null,
        type: r.type,
        title: r.title ?? undefined,
        body: r.body ?? undefined,
        is_read: r.is_read,
        delivered_at: r.delivered_at ? toISOStringSafe(r.delivered_at) : null,
        created_at: toISOStringSafe(r.created_at),
        related_thread_id: r.related_thread_id ?? null,
        related_post_id: r.related_post_id ?? null,
        related_moderation_case_id: r.related_moderation_case_id ?? null,
      };
    });

    const pagination = {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    };

    return {
      pagination,
      data,
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
