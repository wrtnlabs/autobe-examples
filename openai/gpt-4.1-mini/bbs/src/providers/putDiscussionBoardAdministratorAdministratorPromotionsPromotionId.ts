import { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function putDiscussionBoardAdministratorAdministratorPromotionsPromotionId(props: {
  administrator: AdministratorPayload;
  promotionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorPromotion.IUpdate;
}): Promise<IDiscussionBoardAdministratorPromotion> {
  const administratorType = typia.assert<
    "administrator" | "super_administrator"
  >(props.administrator.type);
  if (administratorType !== "super_administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const existing =
    await MyGlobal.prisma.discussion_board_administrator_promotions.findUnique({
      where: { id: props.promotionId },
    });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Promotion not found", 404);
  }
  const updated =
    await MyGlobal.prisma.discussion_board_administrator_promotions.update({
      where: { id: props.promotionId },
      data: {
        ...props.body,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  return {
    id: updated.id,
    discussion_board_administrator_id:
      updated.discussion_board_administrator_id,
    old_grade_id: updated.old_grade_id,
    new_grade_id: updated.new_grade_id,
    created_at: toISOStringSafe(new Date(updated.created_at)),
    updated_at: toISOStringSafe(new Date(updated.updated_at)),
    deleted_at:
      updated.deleted_at === null
        ? null
        : toISOStringSafe(new Date(updated.deleted_at)),
  };
}
