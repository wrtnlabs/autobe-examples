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

export async function patchDiscussionBoardAdminDiscussionBoardModerationLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardModerationLog.IRequest;
}): Promise<IPageIDiscussionBoardModerationLog.ISummary> {
  const { body } = props;

  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  const whereConditions = {
    ...(body.post_id !== undefined &&
      body.post_id !== null && { post_id: body.post_id }),
    ...(body.reply_id !== undefined &&
      body.reply_id !== null && { reply_id: body.reply_id }),
    ...(body.moderator_id !== undefined &&
      body.moderator_id !== null && { moderator_id: body.moderator_id }),
    ...(body.action_type !== undefined &&
      body.action_type !== null && { action_type: body.action_type }),
  };

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
  ) {
    Object.assign(whereConditions, {
      OR: [
        { action_type: { contains: body.search } },
        { action_details: { contains: body.search } },
      ],
    });
  }

  const orderByField =
    body.order_by === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_logs.findMany({
      where: whereConditions,
      orderBy: orderByField,
      skip,
      take: limit,
      select: {
        id: true,
        post_id: true,
        reply_id: true,
        moderator_id: true,
        action_type: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_moderation_logs.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((log) => ({
      id: log.id,
      post_id: log.post_id ?? null,
      reply_id: log.reply_id ?? null,
      moderator_id: log.moderator_id ?? null,
      action_type: log.action_type,
      created_at: toISOStringSafe(log.created_at),
    })),
  };
}
