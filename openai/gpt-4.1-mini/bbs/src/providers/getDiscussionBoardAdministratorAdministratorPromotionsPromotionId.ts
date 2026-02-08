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

export async function getDiscussionBoardAdministratorAdministratorPromotionsPromotionId(props: {
  administrator: AdministratorPayload;
  promotionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorPromotion> {
  const record =
    await MyGlobal.prisma.discussion_board_administrator_promotions.findUnique({
      where: { id: props.promotionId },
      select: {
        id: true,
        discussion_board_administrator_id: true,
        old_grade_id: true,
        new_grade_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record || record.deleted_at !== null) {
    throw new HttpException("Promotion record not found", 404);
  }
  // Helper to convert Date to string & tags.Format<'date-time'> or null
  function formatDate(date: Date | null): string | null {
    if (date === null) return null;
    return toISOStringSafe(date);
  }
  return {
    id: record.id,
    administrator_id: record.discussion_board_administrator_id,
    old_grade_id: record.old_grade_id,
    new_grade_id: record.new_grade_id,
    created_at: formatDate(record.created_at)!,
    updated_at: formatDate(record.updated_at)!,
    deleted_at: formatDate(record.deleted_at),
  };
}
