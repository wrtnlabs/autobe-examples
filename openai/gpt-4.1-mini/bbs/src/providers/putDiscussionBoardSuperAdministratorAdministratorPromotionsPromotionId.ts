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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardAdministratorPromotionTransformer } from "../transformers/DiscussionBoardAdministratorPromotionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdministratorAdministratorPromotionsPromotionId(props: {
  superAdministrator: SuperadministratorPayload;
  promotionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorPromotion.IUpdate;
}): Promise<IDiscussionBoardAdministratorPromotion> {
  const existing =
    await MyGlobal.prisma.discussion_board_administrator_promotions.findUnique({
      where: { id: props.promotionId },
    });
  if (!existing) {
    throw new HttpException("Promotion record not found", 404);
  }
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  await MyGlobal.prisma.discussion_board_administrator_promotions.update({
    where: { id: props.promotionId },
    data: {
      discussion_board_administrator_id:
        props.body.discussion_board_administrator_id,
      old_grade_id: props.body.old_grade_id,
      new_grade_id: props.body.new_grade_id,
      deleted_at: props.body.deleted_at ?? null,
      updated_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.discussion_board_administrator_promotions.findUniqueOrThrow(
      {
        where: { id: props.promotionId },
        ...DiscussionBoardAdministratorPromotionTransformer.select(),
      },
    );
  return await DiscussionBoardAdministratorPromotionTransformer.transform(
    updated,
  );
}
