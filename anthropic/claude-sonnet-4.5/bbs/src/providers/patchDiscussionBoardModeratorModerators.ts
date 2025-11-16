import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModerators(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerator.IRequest;
}): Promise<IPageIDiscussionBoardModerator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";

  const whereCondition = props.body.search
    ? {
        OR: [
          {
            username: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            email: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderators.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        [sortField]: sortOrder,
      },
    }),
    MyGlobal.prisma.discussion_board_moderators.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((moderator) => ({
      id: moderator.id,
      email: moderator.email,
      username: moderator.username,
      created_at: toISOStringSafe(moderator.created_at),
      updated_at: toISOStringSafe(moderator.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
