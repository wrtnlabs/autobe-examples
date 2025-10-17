import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussNotification";
import { IENotificationSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IENotificationSortBy";
import { IESortDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortDirection";
import { IPageIEconDiscussNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussNotification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchEconDiscussMemberMeNotifications(props: {
  member: MemberPayload;
  body: IEconDiscussNotification.IRequest;
}): Promise<IPageIEconDiscussNotification> {
  const { member, body } = props;

  // Pagination defaults (1-based page)
  const page = Number(body.page ?? 1);
  const limit = Number(body.pageSize ?? 20);
  const skip = (page - 1) * limit;
  const take = limit;

  // Sort direction and key mapping
  const dir: "asc" | "desc" = body.sortDir === "asc" ? "asc" : "desc";

  // Build where condition with soft-delete and ownership scope
  const whereCondition = {
    recipient_user_id: member.id,
    deleted_at: null,
    ...(body.isRead !== undefined
      ? body.isRead
        ? { read_at: { not: null } }
        : { read_at: null }
      : {}),
    ...(body.type !== undefined && { type: body.type }),
    ...(body.entityType !== undefined && { entity_type: body.entityType }),
    ...(body.entityId !== undefined && { entity_id: body.entityId }),
    ...(body.dateFrom !== undefined || body.dateTo !== undefined
      ? {
          created_at: {
            ...(body.dateFrom !== undefined && { gte: body.dateFrom }),
            ...(body.dateTo !== undefined && { lte: body.dateTo }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_notifications.findMany({
      where: whereCondition,
      orderBy:
        body.sortBy === "updatedAt"
          ? { updated_at: dir }
          : body.sortBy === "readAt"
            ? { read_at: dir }
            : { created_at: dir },
      skip,
      take,
    }),
    MyGlobal.prisma.econ_discuss_notifications.count({ where: whereCondition }),
  ]);

  const data: IEconDiscussNotification[] = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    type: r.type,
    title: r.title,
    body: r.body ?? null,
    actorUserId:
      r.actor_user_id === null
        ? null
        : (r.actor_user_id as string & tags.Format<"uuid">),
    entityType: r.entity_type ?? null,
    entityId:
      r.entity_id === null
        ? null
        : (r.entity_id as string & tags.Format<"uuid">),
    isRead: r.read_at !== null,
    readAt: r.read_at ? toISOStringSafe(r.read_at) : null,
    createdAt: toISOStringSafe(r.created_at),
    updatedAt: toISOStringSafe(r.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit || 1)),
    },
    data,
  };
}
