import { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorAdministratorPromotions(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAdministratorPromotion.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorPromotion.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where: any = { deleted_at: null };
  const data =
    await MyGlobal.prisma.discussion_board_administrator_promotions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        discussion_board_administrator_id: true,
        old_grade_id: true,
        new_grade_id: true,
        created_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.discussion_board_administrator_promotions.count({
      where,
    });
  return {
    data: data.map((record) => ({
      id: record.id,
      administrator_id: record.discussion_board_administrator_id,
      old_grade: record.old_grade_id,
      new_grade: record.new_grade_id,
      created_at: toISOStringSafe(record.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
