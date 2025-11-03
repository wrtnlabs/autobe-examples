import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorAuditLogs(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
  const { moderator, body } = props;

  if (!moderator || !moderator.id) {
    throw new HttpException("Unauthorized: moderator required", 403);
  }

  const page = (body.page ?? 1) as number & tags.Type<"int32">;
  const limit = (body.limit ?? 20) as number & tags.Type<"int32">;

  if (Number(limit) > 100) throw new HttpException("limit must be <= 100", 400);
  if (Number(page) < 1) throw new HttpException("page must be >= 1", 400);

  if (
    body.dateFrom !== undefined &&
    body.dateTo !== undefined &&
    body.dateFrom !== null &&
    body.dateTo !== null
  ) {
    const from = Date.parse(body.dateFrom);
    const to = Date.parse(body.dateTo);
    if (Number.isNaN(from) || Number.isNaN(to) || from > to) {
      throw new HttpException("Invalid date range", 400);
    }
  }

  const sort = body.sort ?? "-event_timestamp";
  const sortField = sort.replace(/^[-+]/, "");
  if (sortField !== "event_timestamp")
    throw new HttpException("Invalid sort field", 400);

  try {
    const skip = (Number(page) - 1) * Number(limit);

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_audit_logs.findMany({
        where: {
          ...(body.eventType !== undefined && { event_type: body.eventType }),
          ...(body.actorType !== undefined && { actor_type: body.actorType }),
          ...(body.actorId !== undefined &&
            body.actorId !== null && { actor_id: body.actorId }),
          ...(body.resourceType !== undefined && {
            resource_type: body.resourceType,
          }),
          ...(body.resourceId !== undefined &&
            body.resourceId !== null && { resource_id: body.resourceId }),
          ...(body.fullText !== undefined &&
            body.fullText !== null && {
              metadata: { contains: body.fullText },
            }),
          ...((body.dateFrom !== undefined && body.dateFrom !== null) ||
          (body.dateTo !== undefined && body.dateTo !== null)
            ? {
                event_timestamp: {
                  ...(body.dateFrom !== undefined &&
                    body.dateFrom !== null && { gte: body.dateFrom }),
                  ...(body.dateTo !== undefined &&
                    body.dateTo !== null && { lte: body.dateTo }),
                },
              }
            : {}),
        },
        orderBy: sort.startsWith("-")
          ? { event_timestamp: "desc" }
          : { event_timestamp: "asc" },
        skip,
        take: Number(limit),
      }),
      MyGlobal.prisma.discussion_board_audit_logs.count({
        where: {
          ...(body.eventType !== undefined && { event_type: body.eventType }),
          ...(body.actorType !== undefined && { actor_type: body.actorType }),
          ...(body.actorId !== undefined &&
            body.actorId !== null && { actor_id: body.actorId }),
          ...(body.resourceType !== undefined && {
            resource_type: body.resourceType,
          }),
          ...(body.resourceId !== undefined &&
            body.resourceId !== null && { resource_id: body.resourceId }),
          ...(body.fullText !== undefined &&
            body.fullText !== null && {
              metadata: { contains: body.fullText },
            }),
          ...((body.dateFrom !== undefined && body.dateFrom !== null) ||
          (body.dateTo !== undefined && body.dateTo !== null)
            ? {
                event_timestamp: {
                  ...(body.dateFrom !== undefined &&
                    body.dateFrom !== null && { gte: body.dateFrom }),
                  ...(body.dateTo !== undefined &&
                    body.dateTo !== null && { lte: body.dateTo }),
                },
              }
            : {}),
        },
      }),
    ]);

    const now = toISOStringSafe(new Date());

    await Promise.all(
      rows.map((r) =>
        MyGlobal.prisma.discussion_board_audit_log_accesses.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            discussion_board_audit_log_id: r.id,
            accessed_at: now,
            accessor_type: "moderator",
            accessor_id: moderator.id,
            accessor_role: "moderator",
            access_purpose: body.fullText ?? "search",
            created_at: now,
          },
        }),
      ),
    );

    const data = rows.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      event_type: r.event_type,
      event_timestamp: toISOStringSafe(r.event_timestamp),
      resource_type: r.resource_type ?? null,
      resource_id: (r.resource_id ?? null) as
        | (string & tags.Format<"uuid">)
        | null,
      actor_type: r.actor_type ?? null,
      actor_id: (r.actor_id ?? null) as (string & tags.Format<"uuid">) | null,
      created_at: toISOStringSafe(r.created_at),
      updated_at: r.updated_at ? toISOStringSafe(r.updated_at) : null,
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    })) as IDiscussionBoardAuditLog.ISummary[];

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / Number(limit)),
      },
      data,
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
