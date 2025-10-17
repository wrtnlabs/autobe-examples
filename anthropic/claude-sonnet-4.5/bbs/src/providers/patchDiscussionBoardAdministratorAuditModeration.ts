import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAuditLog";
import { IPageIDiscussionBoardModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchDiscussionBoardAdministratorAuditModeration(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardModerationAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardModerationAuditLog> {
  const { body } = props;

  // Extract and validate pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Validate sort parameters
  const allowedSortFields = ["created_at", "action_type", "moderator_id"];
  const sortBy =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Execute concurrent queries for data and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_audit_logs.findMany({
      where: {
        ...(body.moderator_id !== undefined &&
          body.moderator_id !== null && {
            moderator_id: body.moderator_id,
          }),
        ...(body.target_user_id !== undefined &&
          body.target_user_id !== null && {
            target_user_id: body.target_user_id,
          }),
        ...(body.action_type !== undefined &&
          body.action_type !== null && {
            action_type: body.action_type,
          }),
        ...(body.target_content_type !== undefined &&
          body.target_content_type !== null && {
            target_content_type: body.target_content_type,
          }),
        ...((body.date_from !== undefined && body.date_from !== null) ||
        (body.date_to !== undefined && body.date_to !== null)
          ? {
              created_at: {
                ...(body.date_from !== undefined &&
                  body.date_from !== null && {
                    gte: body.date_from,
                  }),
                ...(body.date_to !== undefined &&
                  body.date_to !== null && {
                    lte: body.date_to,
                  }),
              },
            }
          : {}),
      },
      orderBy: { [sortBy]: sortOrder },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_moderation_audit_logs.count({
      where: {
        ...(body.moderator_id !== undefined &&
          body.moderator_id !== null && {
            moderator_id: body.moderator_id,
          }),
        ...(body.target_user_id !== undefined &&
          body.target_user_id !== null && {
            target_user_id: body.target_user_id,
          }),
        ...(body.action_type !== undefined &&
          body.action_type !== null && {
            action_type: body.action_type,
          }),
        ...(body.target_content_type !== undefined &&
          body.target_content_type !== null && {
            target_content_type: body.target_content_type,
          }),
        ...((body.date_from !== undefined && body.date_from !== null) ||
        (body.date_to !== undefined && body.date_to !== null)
          ? {
              created_at: {
                ...(body.date_from !== undefined &&
                  body.date_from !== null && {
                    gte: body.date_from,
                  }),
                ...(body.date_to !== undefined &&
                  body.date_to !== null && {
                    lte: body.date_to,
                  }),
              },
            }
          : {}),
      },
    }),
  ]);

  // Transform database results to API response format
  const data: IDiscussionBoardModerationAuditLog[] = rows.map((row) => ({
    id: row.id,
    moderator_id: row.moderator_id ?? undefined,
    target_user_id: row.target_user_id ?? undefined,
    action_type: row.action_type,
    target_content_id: row.target_content_id ?? undefined,
    target_content_type: row.target_content_type ?? undefined,
    reason: row.reason,
    metadata: row.metadata ?? undefined,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Calculate pagination metadata
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
