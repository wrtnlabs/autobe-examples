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

export async function patchDiscussionBoardModeratorArticlesArticleIdModerationHistory(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerationLog.IRequest;
}): Promise<IPageIDiscussionBoardModerationLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_logs.findMany({
      where: {
        discussion_board_article_id: props.articleId,
        ...(props.body.action_types &&
          props.body.action_types.length > 0 && {
            action_type: { in: props.body.action_types },
          }),
        ...(props.body.moderator_id && {
          discussion_board_moderator_id: props.body.moderator_id,
        }),
        ...((props.body.from_date || props.body.to_date) && {
          created_at: {
            ...(props.body.from_date && {
              gte: new Date(props.body.from_date),
            }),
            ...(props.body.to_date && { lte: new Date(props.body.to_date) }),
          },
        }),
        ...(props.body.member_id && {
          discussion_board_member_id: props.body.member_id,
        }),
      },
      skip,
      take: limit,
      orderBy:
        props.body.sort_by === "action_type"
          ? { action_type: props.body.order ?? "desc" }
          : { created_at: props.body.order ?? "desc" },
    }),
    MyGlobal.prisma.discussion_board_moderation_logs.count({
      where: {
        discussion_board_article_id: props.articleId,
        ...(props.body.action_types &&
          props.body.action_types.length > 0 && {
            action_type: { in: props.body.action_types },
          }),
        ...(props.body.moderator_id && {
          discussion_board_moderator_id: props.body.moderator_id,
        }),
        ...((props.body.from_date || props.body.to_date) && {
          created_at: {
            ...(props.body.from_date && {
              gte: new Date(props.body.from_date),
            }),
            ...(props.body.to_date && { lte: new Date(props.body.to_date) }),
          },
        }),
        ...(props.body.member_id && {
          discussion_board_member_id: props.body.member_id,
        }),
      },
    }),
  ]);

  return typia.assert<IPageIDiscussionBoardModerationLog.ISummary>({
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((log) => ({
      id: log.id,
      discussion_board_moderator_id: log.discussion_board_moderator_id,
      discussion_board_article_id: log.discussion_board_article_id ?? undefined,
      discussion_board_member_id: log.discussion_board_member_id ?? undefined,
      action_type: log.action_type,
      reason: log.reason,
      action_details: log.action_details ?? undefined,
      created_at: toISOStringSafe(log.created_at),
    })),
  });
}
