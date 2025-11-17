import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerationAction";
import { IPageIEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchEconomicBoardModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: IEconomicBoardModerationAction.IRequest;
}): Promise<IPageIEconomicBoardModerationAction.ISummary> {
  const {
    citizen_id,
    moderator_id,
    created_at_from,
    created_at_to,
    sort = "created_at:desc",
    page = 1,
    limit = 20,
  } = props.body;

  const skip = (page - 1) * limit;
  const take = limit > 100 ? 100 : limit;

  const where: {
    citizen_id?: string;
    moderator_id?: string;
    created_at?: { gte?: string; lte?: string };
  } = {};

  if (citizen_id) where.citizen_id = citizen_id;
  if (moderator_id) where.moderator_id = moderator_id;

  if (created_at_from || created_at_to) {
    where.created_at = {};
    if (created_at_from) where.created_at.gte = created_at_from;
    if (created_at_to) where.created_at.lte = created_at_to;
  }

  const orderBy: Record<string, "asc" | "desc"> = {};
  if (sort === "created_at:asc") orderBy.created_at = "asc";
  if (sort === "created_at:desc") orderBy.created_at = "desc";

  const [actions, total] = await Promise.all([
    MyGlobal.prisma.economic_board_moderation_actions.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.economic_board_moderation_actions.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
    data: actions.map((action) => ({
      id: action.id,
      created_at: toISOStringSafe(action.created_at),
      moderator_id: action.moderator_id,
      citizen_id: action.citizen_id,
    })),
  };
}
