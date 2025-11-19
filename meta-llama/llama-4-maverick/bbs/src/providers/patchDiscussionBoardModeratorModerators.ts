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
  const { moderator: auth, body } = props;

  const searchCriteria = JSON.parse(body as string);

  const page = searchCriteria.page ?? 1;
  const limit = searchCriteria.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null,
    ...(searchCriteria.username && {
      username: { contains: searchCriteria.username },
    }),
    ...(searchCriteria.email && { email: { contains: searchCriteria.email } }),
    ...(searchCriteria.is_active !== undefined && {
      is_active: searchCriteria.is_active,
    }),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderators.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_moderators.count({
      where: whereCondition,
    }),
  ]);

  const result: IPageIDiscussionBoardModerator.ISummary = {
    data: data.map((moderator) => moderator.id),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };

  return result satisfies IPageIDiscussionBoardModerator.ISummary;
}
