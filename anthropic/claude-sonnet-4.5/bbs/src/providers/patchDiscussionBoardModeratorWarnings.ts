import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";
import { IPageIDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardWarning";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorWarnings(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardWarning.IRequest;
}): Promise<IPageIDiscussionBoardWarning> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 25;
  const skip = (page - 1) * limit;

  const whereCondition = {
    ...(body.warning_level !== undefined &&
      body.warning_level !== null && {
        warning_level: body.warning_level,
      }),
    ...(body.violation_category !== undefined &&
      body.violation_category !== null && {
        violation_category: body.violation_category,
      }),
    ...(body.member_id !== undefined &&
      body.member_id !== null && {
        member_id: body.member_id,
      }),
    ...(body.is_active !== undefined &&
      body.is_active !== null && {
        is_active: body.is_active,
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
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_warnings.findMany({
      where: whereCondition,
      orderBy:
        body.sort_by === "created_at"
          ? { created_at: body.sort_order === "asc" ? "asc" : "desc" }
          : body.sort_by === "expiration_date"
            ? { expiration_date: body.sort_order === "asc" ? "asc" : "desc" }
            : body.sort_by === "warning_level"
              ? { warning_level: body.sort_order === "asc" ? "asc" : "desc" }
              : body.sort_by === "updated_at"
                ? { updated_at: body.sort_order === "asc" ? "asc" : "desc" }
                : { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_warnings.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((warning) => ({
      id: warning.id,
      member_id: warning.member_id,
      moderation_action_id: warning.moderation_action_id,
      content_topic_id: warning.content_topic_id ?? undefined,
      content_reply_id: warning.content_reply_id ?? undefined,
      warning_level: warning.warning_level,
      violation_category: warning.violation_category,
      moderator_notes: warning.moderator_notes,
      expiration_date: warning.expiration_date
        ? toISOStringSafe(warning.expiration_date)
        : undefined,
      is_active: warning.is_active,
      expired_at: warning.expired_at
        ? toISOStringSafe(warning.expired_at)
        : undefined,
      created_at: toISOStringSafe(warning.created_at),
      updated_at: toISOStringSafe(warning.updated_at),
    })),
  };
}
