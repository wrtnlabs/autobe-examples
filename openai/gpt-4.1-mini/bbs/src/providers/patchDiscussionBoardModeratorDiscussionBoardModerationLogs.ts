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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorDiscussionBoardModerationLogs(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationLog.IRequest;
}): Promise<IPageIDiscussionBoardModerationLog.ISummary> {
  const { body } = props;

  const skip = ((body.page ?? 1) - 1) * (body.limit ?? 10);
  const take = body.limit ?? 10;

  const where = {
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { action_type: { contains: body.search } },
          { action_details: { contains: body.search } },
        ],
      }),
    ...(body.action_type !== undefined &&
      body.action_type !== null && {
        action_type: body.action_type,
      }),
    ...(body.moderator_id !== undefined &&
      body.moderator_id !== null && {
        moderator_id: body.moderator_id,
      }),
    ...(body.post_id !== undefined &&
      body.post_id !== null && {
        post_id: body.post_id,
      }),
    ...(body.reply_id !== undefined &&
      body.reply_id !== null && {
        reply_id: body.reply_id,
      }),
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_logs.findMany({
      where,
      orderBy:
        body.order_by === "created_at_asc"
          ? { created_at: "asc" }
          : { created_at: "desc" },
      skip,
      take,
      select: {
        id: true,
        post_id: true,
        reply_id: true,
        moderator_id: true,
        action_type: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_moderation_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(body.page ?? 1),
      limit: Number(body.limit ?? 10),
      records: total,
      pages: Math.ceil(total / (body.limit ?? 10)),
    },
    data: records.map((record) => ({
      id: record.id,
      post_id: record.post_id === null ? null : record.post_id,
      reply_id: record.reply_id === null ? null : record.reply_id,
      moderator_id: record.moderator_id === null ? null : record.moderator_id,
      action_type: record.action_type,
      created_at: toISOStringSafe(record.created_at),
    })),
  };
}
