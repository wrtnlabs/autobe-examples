import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminModerationLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardModerationLog.IRequest;
}): Promise<IPageIDiscussionBoardModerationLog.ISummary> {
  const {
    action,
    outcome,
    target_type,
    target_id,
    admin_id,
    date_from,
    date_to,
    search,
    page,
    limit,
    sort_by,
    sort_order,
  } = props.body;

  // Pagination
  const pageNum = page && page > 0 ? page : 1;
  const perPage = limit && limit > 0 && limit <= 100 ? limit : 100;
  const skip = (pageNum - 1) * perPage;

  // Filtering and search
  const where: Record<string, unknown> = {
    ...(action && { action }),
    ...(outcome && { outcome }),
    ...(target_type && { target_type }),
    ...(target_id && { target_id }),
    ...(admin_id && { admin_id }),
    ...(date_from && { created_at: { gte: date_from } }),
    ...(date_to && {
      created_at: {
        ...(date_from ? { gte: date_from } : {}),
        lte: date_to,
      },
    }),
    ...(search && {
      OR: [
        { reason: { contains: search } },
        { action: { contains: search } },
        { outcome: { contains: search } },
      ],
    }),
  };

  // Remove empty created_at field if not set
  if (!date_from && !date_to && where.created_at) {
    delete where.created_at;
  }

  // Ordering
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (sort_by) {
    orderBy = { [sort_by]: sort_order === "asc" ? "asc" : "desc" };
  }

  // Query moderation logs and count in parallel
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_logs.findMany({
      where,
      skip,
      take: perPage,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_moderation_logs.count({ where }),
  ]);

  // Map each log to API summary DTO
  const records = data.map((log) => ({
    id: log.id,
    target_type: log.target_type,
    target_id: log.target_id,
    admin_id: log.admin_id,
    action: log.action,
    reason: log.reason,
    outcome: log.outcome,
    created_at: toISOStringSafe(log.created_at),
  }));

  return {
    data: records,
    pagination: {
      current: pageNum,
      limit: perPage,
      records: total,
      pages: Math.ceil(total / perPage),
    },
  };
}
