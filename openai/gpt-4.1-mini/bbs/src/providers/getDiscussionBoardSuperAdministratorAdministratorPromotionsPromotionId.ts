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

export async function getDiscussionBoardSuperAdministratorAdministratorPromotionsPromotionId(props: {
  superAdministrator: SuperadministratorPayload;
  promotionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorPromotion> {
  const promotion =
    await MyGlobal.prisma.discussion_board_administrator_promotions.findUniqueOrThrow(
      {
        where: { id: props.promotionId },
        ...DiscussionBoardAdministratorPromotionTransformer.select(),
      },
    );
  return await DiscussionBoardAdministratorPromotionTransformer.transform(
    promotion,
  );
}
