import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsNotification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityBbsNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsNotification";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function patchCommunityBbsCommunityMemberNotifications(props: {
  communityMember: CommunitymemberPayload;
  body: ICommunityBbsNotification.IRequest;
}): Promise<IPageICommunityBbsNotification.ISummary> {
  const { communityMember, body } = props;
  if (!communityMember) throw new HttpException("Unauthorized", 401);

  const page = Number(body.pagination?.page ?? 1);
  const limit = Math.min(Number(body.pagination?.limit ?? 20), 100);
  const skip = (page - 1) * limit;

  const buildWhere = () => ({
    recipient_id: communityMember.id,
    deleted_at: null,
    ...(body.filters?.status !== undefined &&
      body.filters?.status !== null && { status: body.filters.status }),
    ...(body.filters?.priority !== undefined &&
      body.filters?.priority !== null && { priority: body.filters.priority }),
    ...(body.filters?.channel !== undefined &&
      body.filters?.channel !== null && { channel: body.filters.channel }),
    ...((body.filters?.created_at_from !== undefined &&
      body.filters?.created_at_from !== null) ||
    (body.filters?.created_at_to !== undefined &&
      body.filters?.created_at_to !== null)
      ? {
          created_at: {
            ...(body.filters?.created_at_from !== undefined &&
              body.filters?.created_at_from !== null && {
                gte: toISOStringSafe(body.filters.created_at_from),
              }),
            ...(body.filters?.created_at_to !== undefined &&
              body.filters?.created_at_to !== null && {
                lte: toISOStringSafe(body.filters.created_at_to),
              }),
          },
        }
      : {}),
    ...((body.filters?.scheduled_at_from !== undefined &&
      body.filters?.scheduled_at_from !== null) ||
    (body.filters?.scheduled_at_to !== undefined &&
      body.filters?.scheduled_at_to !== null)
      ? {
          scheduled_at: {
            ...(body.filters?.scheduled_at_from !== undefined &&
              body.filters?.scheduled_at_from !== null && {
                gte: toISOStringSafe(body.filters.scheduled_at_from),
              }),
            ...(body.filters?.scheduled_at_to !== undefined &&
              body.filters?.scheduled_at_to !== null && {
                lte: toISOStringSafe(body.filters.scheduled_at_to),
              }),
          },
        }
      : {}),
    ...(body.filters?.suppressed !== undefined &&
      body.filters?.suppressed !== null && {
        suppressed: body.filters.suppressed,
      }),
    ...(body.filters?.q !== undefined &&
      body.filters?.q !== null && { body: { contains: body.filters.q } }),
  });

  const orderBy: Prisma.community_bbs_notificationsOrderByWithRelationInput =
    body.sort === "created_at.asc"
      ? { created_at: "asc" as Prisma.SortOrder }
      : { created_at: "desc" as Prisma.SortOrder };

  // Initial read (before potential batch updates)
  let [rows, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_notifications.findMany({
      where: buildWhere(),
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_bbs_notifications.count({ where: buildWhere() }),
  ]);

  if (body.batchUpdate) {
    const ids = body.batchUpdate.ids;
    if (!ids || ids.length === 0)
      throw new HttpException("Batch update requires non-empty ids", 400);

    const owned = await MyGlobal.prisma.community_bbs_notifications.findMany({
      where: { id: { in: ids }, recipient_id: communityMember.id },
      select: { id: true },
    });
    const ownedSet = new Set(owned.map((r) => r.id));
    const invalid = ids.filter((id) => !ownedSet.has(id));
    if (invalid.length > 0) {
      throw new HttpException(
        `Some ids are invalid or not owned by you: ${invalid.join(",")}`,
        422,
      );
    }

    await Promise.all(
      ids.map(async (id) => {
        await MyGlobal.prisma.community_bbs_notifications.update({
          where: { id },
          data: {
            ...(body.batchUpdate!.patch.status !== undefined && {
              status: body.batchUpdate!.patch.status,
            }),
            ...(body.batchUpdate!.patch.suppressed !== undefined && {
              suppressed: body.batchUpdate!.patch.suppressed,
            }),
            ...(body.batchUpdate!.patch.delivered_at !== undefined && {
              delivered_at:
                body.batchUpdate!.patch.delivered_at === null
                  ? null
                  : toISOStringSafe(body.batchUpdate!.patch.delivered_at),
            }),
          },
        });

        await MyGlobal.prisma.community_bbs_audit_logs.create({
          data: {
            id: v4(),
            actor_type: "communityMember",
            actor_id: communityMember.id,
            entity: "notification",
            action: "update",
            payload: JSON.stringify({ id, patch: body.batchUpdate!.patch }),
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
          },
        });
      }),
    );

    // Re-read after updates
    [rows, total] = await Promise.all([
      MyGlobal.prisma.community_bbs_notifications.findMany({
        where: buildWhere(),
        orderBy,
        skip,
        take: limit,
      }),
      MyGlobal.prisma.community_bbs_notifications.count({
        where: buildWhere(),
      }),
    ]);
  }

  const data = rows.map((r) => ({
    id: r.id,
    notification_key: r.notification_key ?? null,
    notification_type: r.notification_type,
    channel: r.channel,
    priority: r.priority,
    status: r.status,
    target_type: r.target_type,
    target_id: r.target_id,
    attempts: Number(r.attempts),
    last_attempt_at: r.last_attempt_at
      ? toISOStringSafe(r.last_attempt_at)
      : null,
    delivered_at: r.delivered_at ? toISOStringSafe(r.delivered_at) : null,
    scheduled_at: r.scheduled_at ? toISOStringSafe(r.scheduled_at) : null,
    suppressed: r.suppressed,
    created_at: toISOStringSafe(r.created_at),
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
}
