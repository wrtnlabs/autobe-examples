import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardAdministratorPromotionTransformer } from "../transformers/DiscussionBoardAdministratorPromotionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdministratorAdministratorPromotions(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardAdministratorPromotion.ICreate;
}): Promise<IDiscussionBoardAdministratorPromotion> {
  const prisma = MyGlobal.prisma;
  // Verify target administrator existence and active status
  const targetAdmin = await prisma.discussion_board_administrators.findUnique({
    where: { id: props.body.discussion_board_administrator_id },
    select: {
      id: true,
      grade_id: true,
      deleted_at: true,
    },
  });
  if (!targetAdmin || targetAdmin.deleted_at !== null) {
    throw new HttpException("Target administrator not found or deleted", 404);
  }
  // Find super administrator grade id
  const superAdminGrade =
    await prisma.discussion_board_administrator_grades.findFirst({
      where: { name: "super administrator" },
    });
  if (!superAdminGrade) {
    throw new HttpException("Super administrator grade not found", 500);
  }
  // Check if target is already super administrator
  if (targetAdmin.grade_id === superAdminGrade.id) {
    throw new HttpException("Target is already a super administrator", 400);
  }
  // Validate new_grade_id matches super administrator grade
  if (props.body.new_grade_id !== superAdminGrade.id) {
    throw new HttpException("Invalid new_grade_id for promotion", 400);
  }
  const now = toISOStringSafe(new Date());
  // Perform the promotion transactionally
  const promotion = await prisma.$transaction(async (prismaTx) => {
    // Collect data for promotion create
    const promotionData =
      await DiscussionBoardAdministratorPromotionCollector.collect({
        body: props.body,
      });
    // Create promotion record
    const createdPromotion =
      await prismaTx.discussion_board_administrator_promotions.create({
        data: promotionData,
        ...DiscussionBoardAdministratorPromotionTransformer.select(),
      });
    // Update target administrator's grade to super administrator
    await prismaTx.discussion_board_administrators.update({
      where: { id: props.body.discussion_board_administrator_id },
      data: {
        grade_id: superAdminGrade.id,
        updated_at: now,
      },
    });
    // Log grade change event with old grade
    await prismaTx.discussion_board_administrator_grade_changes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_administrator_id:
          props.body.discussion_board_administrator_id,
        discussion_board_administrator_grade_id: targetAdmin.grade_id, // old grade id required
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return createdPromotion;
  });
  // Transform and return the created promotion record
  return await DiscussionBoardAdministratorPromotionTransformer.transform(
    promotion,
  );
}
