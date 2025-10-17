import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSecurityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityLog";
import { IPageIDiscussionBoardSecurityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchDiscussionBoardAdministratorAuditSecurity(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardSecurityLog.IRequest;
}): Promise<IPageIDiscussionBoardSecurityLog> {
  const { administrator, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 25;
  const skip = (page - 1) * limit;

  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";

  const [logs, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_security_logs.findMany({
      where: {
        ...(body.user_id !== undefined &&
          body.user_id !== null && {
            user_id: body.user_id,
          }),
        ...(body.event_type !== undefined &&
          body.event_type !== null && {
            event_type: body.event_type,
          }),
        ...(body.severity !== undefined &&
          body.severity !== null && {
            severity: body.severity,
          }),
        ...(body.ip_address !== undefined &&
          body.ip_address !== null && {
            ip_address: {
              contains: body.ip_address,
            },
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
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_security_logs.count({
      where: {
        ...(body.user_id !== undefined &&
          body.user_id !== null && {
            user_id: body.user_id,
          }),
        ...(body.event_type !== undefined &&
          body.event_type !== null && {
            event_type: body.event_type,
          }),
        ...(body.severity !== undefined &&
          body.severity !== null && {
            severity: body.severity,
          }),
        ...(body.ip_address !== undefined &&
          body.ip_address !== null && {
            ip_address: {
              contains: body.ip_address,
            },
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

  const data = logs.map((log) => ({
    id: log.id,
    user_id: log.user_id ?? undefined,
    event_type: log.event_type,
    severity: log.severity,
    ip_address: log.ip_address,
    user_agent: log.user_agent ?? undefined,
    description: log.description,
    metadata: log.metadata ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
