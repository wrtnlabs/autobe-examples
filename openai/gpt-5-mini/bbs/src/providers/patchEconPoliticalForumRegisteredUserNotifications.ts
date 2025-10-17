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

export async function patchEconPoliticalForumRegisteredUserNotifications(props: {
  registeredUser: RegistereduserPayload;
  body: IEconPoliticalForumNotification.IRequest;
}): Promise<IPageIEconPoliticalForumNotification.ISummary> {
  const { registeredUser, body } = props;

  if (!registeredUser || !registeredUser.id) {
    throw new HttpException("Unauthorized", 401);
  }

  // Pagination defaults and sanitization
  const page = Number(body.page ?? 1);
  const rawLimit = Number(body.limit ?? 20);
  if (!Number.isFinite(page) || page < 1) {
    throw new HttpException("Bad Request: invalid page", 400);
  }
  if (!Number.isFinite(rawLimit) || rawLimit < 1) {
    throw new HttpException("Bad Request: invalid limit", 400);
  }
  const limit = Math.min(rawLimit, 100);
  const skip = (page - 1) * limit;

  try {
    // Build where conditions inline (schema-verified fields only)
    const where = {
      registereduser_id: registeredUser.id,
      deleted_at: null,
      ...(body.is_read !== undefined && { is_read: body.is_read }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.related_thread_id !== undefined &&
        body.related_thread_id !== null && {
          related_thread_id: body.related_thread_id,
        }),
      ...(body.related_post_id !== undefined &&
        body.related_post_id !== null && {
          related_post_id: body.related_post_id,
        }),
      ...((body.created_from !== undefined && body.created_from !== null) ||
      (body.created_to !== undefined && body.created_to !== null)
        ? {
            created_at: {
              ...(body.created_from !== undefined &&
                body.created_from !== null && { gte: body.created_from }),
              ...(body.created_to !== undefined &&
                body.created_to !== null && { lte: body.created_to }),
            },
          }
        : {}),
      ...(body.q
        ? {
            OR: [
              { title: { contains: body.q } },
              { body: { contains: body.q } },
              { payload: { contains: body.q } },
            ],
          }
        : {}),
    };

    // Determine orderBy inline (Prisma-compatible and cross-engine safe)
    const order = (body.order === "asc" ? "asc" : "desc") as "asc" | "desc";
    const orderBy =
      body.sort_by === "type" ? { type: order } : { created_at: order };

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_notifications.findMany({
        where,
        orderBy,
        skip,
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
          payload: true,
        },
      }),
      MyGlobal.prisma.econ_political_forum_notifications.count({ where }),
    ]);

    const data = rows.map((record) => ({
      id: record.id,
      registereduser_id: record.registereduser_id,
      actor_registereduser_id: record.actor_registereduser_id ?? null,
      type: record.type,
      title: record.title ?? undefined,
      body: record.body ?? undefined,
      is_read: record.is_read,
      delivered_at: record.delivered_at
        ? toISOStringSafe(record.delivered_at)
        : null,
      created_at: toISOStringSafe(record.created_at),
      related_thread_id: record.related_thread_id ?? null,
      related_post_id: record.related_post_id ?? null,
      related_moderation_case_id: record.related_moderation_case_id ?? null,
    }));

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / limit),
      },
      data,
    };
  } catch (err) {
    // Prisma or unexpected errors
    throw new HttpException("Internal Server Error", 500);
  }
}
