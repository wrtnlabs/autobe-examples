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
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminModerationLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardModerationLog.IRequest;
}): Promise<IPageIDiscussionBoardModerationLog.ISummary> {
  const {
    admin_id,
    target_type,
    target_id,
    action_code,
    note,
    created_at_from,
    created_at_to,
    sort_by,
    sort_order,
    page,
    limit,
  } = props.body || {};
  const take =
    typeof limit === "number" ? Math.max(1, Math.min(limit, 100)) : 20;
  const currentPage = typeof page === "number" && page >= 1 ? page : 1;
  const skip = (currentPage - 1) * take;
  const filters = {
    deleted_at: null,
    ...(admin_id && { admin_id }),
    ...(target_type && { target_type }),
    ...(target_id && { target_id }),
    ...(action_code && { action_code }),
    ...(note && {
      note: { contains: note, mode: "insensitive" as Prisma.QueryMode },
    }),
    ...((created_at_from || created_at_to) && {
      created_at: {
        ...(created_at_from && { gte: created_at_from }),
        ...(created_at_to && { lte: created_at_to }),
      },
    }),
  };
  const allowedSortFields = ["created_at", "admin_id", "action_code"];
  const sortField = allowedSortFields.includes(sort_by || "")
    ? sort_by
    : "created_at";
  const direction = sort_order === "asc" ? "asc" : "desc";
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_logs.findMany({
      where: filters,
      orderBy: { [sortField as string]: direction },
      skip,
      take,
      include: {
        admin: true,
      },
    }),
    MyGlobal.prisma.discussion_board_moderation_logs.count({ where: filters }),
  ]);
  const data = rows.map((row) => ({
    id: row.id,
    admin: {
      id: row.admin.id,
      display_name: row.admin.email,
    },
    target_type: row.target_type,
    target_id: row.target_id,
    action_code: row.action_code,
    note:
      typeof row.note === "string"
        ? row.note
        : row.note === null
          ? null
          : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));
  const pages = take > 0 ? Math.ceil(total / take) : 0;
  return {
    data,
    pagination: {
      current: currentPage,
      limit: take,
      records: total,
      pages,
    },
  };
}
