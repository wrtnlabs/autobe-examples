import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationAction.IRequest;
}): Promise<IPageIDiscussionBoardModerationAction.ISummary> {
  if (!props.moderator) {
    throw new HttpException("Unauthorized", 401);
  }

  if (props.body !== null) {
    throw new HttpException("Invalid request body", 400);
  }

  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_actions.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        moderator: true,
      },
    }),
    MyGlobal.prisma.discussion_board_moderation_actions.count(),
  ]);

  const result: IPageIDiscussionBoardModerationAction.ISummary = {
    data: data.map((action) => ({
      id: action.id,
      action: action.action_taken,
      result: action.result !== null ? action.result : "",
      moderator: action.moderator.id,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };

  return result;
}
