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

export async function deleteDiscussionBoardAdministratorAdministratorPromotionsPromotionId(props: {
  administrator: AdministratorPayload;
  promotionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorPromotion> {
  const record =
    await MyGlobal.prisma.discussion_board_administrator_promotions.findUnique({
      where: { id: props.promotionId },
    });
  if (record === null || record.deleted_at !== null) {
    throw new HttpException("Promotion record not found", 404);
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const deleted =
    await MyGlobal.prisma.discussion_board_administrator_promotions.update({
      where: { id: props.promotionId },
      data: { deleted_at: now },
      select: {
        id: true,
        oldGrade: true,
        newGrade: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return deleted;
}
