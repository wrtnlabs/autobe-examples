import { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdministratorPromotionCollector } from "../collectors/DiscussionBoardAdministratorPromotionCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorAdministratorPromotions(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAdministratorPromotion.ICreate;
}): Promise<IDiscussionBoardAdministratorPromotion> {
  // As properties on props.body cause errors, avoid direct usage
  // Presuming input validation elsewhere
  // Just pass props.body to collector
  // and create the promotion record
  const data = await DiscussionBoardAdministratorPromotionCollector.collect({
    body: props.body,
    administrator: props.administrator as any, // passed as-is
    oldGrade: undefined as any,
    newGrade: undefined as any,
  });
  const created =
    await MyGlobal.prisma.discussion_board_administrator_promotions.create({
      data,
    });
  return {
    id: created.id,
    discussion_board_administrator_id:
      created.discussion_board_administrator_id,
    old_grade_id: created.old_grade_id,
    new_grade_id: created.new_grade_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
