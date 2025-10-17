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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchDiscussionBoardAdministratorAuditLogs(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 25;
  const skip = (page - 1) * limit;

  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_audit_logs.findMany({
      where: {
        ...(body.user_id !== undefined &&
          body.user_id !== null && {
            user_id: body.user_id,
          }),
        ...(body.action_type !== undefined &&
          body.action_type !== null && {
            action_type: body.action_type,
          }),
        ...(body.entity_type !== undefined &&
          body.entity_type !== null && {
            entity_type: body.entity_type,
          }),
        ...(body.entity_id !== undefined &&
          body.entity_id !== null && {
            entity_id: body.entity_id,
          }),
        ...(body.ip_address !== undefined &&
          body.ip_address !== null && {
            ip_address: body.ip_address,
          }),
        ...((body.start_date !== undefined && body.start_date !== null) ||
        (body.end_date !== undefined && body.end_date !== null)
          ? {
              created_at: {
                ...(body.start_date !== undefined &&
                  body.start_date !== null && {
                    gte: body.start_date,
                  }),
                ...(body.end_date !== undefined &&
                  body.end_date !== null && {
                    lte: body.end_date,
                  }),
              },
            }
          : {}),
      },
      orderBy:
        sortBy === "created_at"
          ? { created_at: sortOrder === "asc" ? "asc" : "desc" }
          : sortBy === "action_type"
            ? { action_type: sortOrder === "asc" ? "asc" : "desc" }
            : sortBy === "entity_type"
              ? { entity_type: sortOrder === "asc" ? "asc" : "desc" }
              : { created_at: sortOrder === "asc" ? "asc" : "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_audit_logs.count({
      where: {
        ...(body.user_id !== undefined &&
          body.user_id !== null && {
            user_id: body.user_id,
          }),
        ...(body.action_type !== undefined &&
          body.action_type !== null && {
            action_type: body.action_type,
          }),
        ...(body.entity_type !== undefined &&
          body.entity_type !== null && {
            entity_type: body.entity_type,
          }),
        ...(body.entity_id !== undefined &&
          body.entity_id !== null && {
            entity_id: body.entity_id,
          }),
        ...(body.ip_address !== undefined &&
          body.ip_address !== null && {
            ip_address: body.ip_address,
          }),
        ...((body.start_date !== undefined && body.start_date !== null) ||
        (body.end_date !== undefined && body.end_date !== null)
          ? {
              created_at: {
                ...(body.start_date !== undefined &&
                  body.start_date !== null && {
                    gte: body.start_date,
                  }),
                ...(body.end_date !== undefined &&
                  body.end_date !== null && {
                    lte: body.end_date,
                  }),
              },
            }
          : {}),
      },
    }),
  ]);

  const data = results.map((log) => ({
    id: log.id,
    user_id: log.user_id ?? undefined,
    action_type: log.action_type,
    entity_type: log.entity_type,
    entity_id: log.entity_id ?? undefined,
    description: log.description,
    metadata: log.metadata ?? undefined,
    ip_address: log.ip_address ?? undefined,
    user_agent: log.user_agent ?? undefined,
    created_at: toISOStringSafe(log.created_at),
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
