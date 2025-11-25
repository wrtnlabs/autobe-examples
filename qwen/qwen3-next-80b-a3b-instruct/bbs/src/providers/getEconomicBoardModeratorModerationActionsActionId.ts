import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getEconomicBoardModeratorModerationActionsActionId(props: {
  moderator: ModeratorPayload;
  actionId: string;
}): Promise<IEconomicBoardModerationAction> {
  const action =
    await MyGlobal.prisma.economic_board_moderation_actions.findUnique({
      where: {
        id: props.actionId,
        deleted_at: null,
      },
    });

  if (!action) {
    throw new HttpException("Moderation action not found", 404);
  }

  return action.id;
}
