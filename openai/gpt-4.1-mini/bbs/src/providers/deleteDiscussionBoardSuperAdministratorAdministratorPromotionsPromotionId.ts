import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdministratorAdministratorPromotionsPromotionId(props: {
  superAdministrator: SuperadministratorPayload;
  promotionId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.discussion_board_administrator_promotions.findUniqueOrThrow(
    {
      where: { id: props.promotionId },
    },
  );
  await MyGlobal.prisma.discussion_board_administrator_promotions.delete({
    where: { id: props.promotionId },
  });
}
