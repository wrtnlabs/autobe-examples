import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getEconomicBoardModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string;
}): Promise<IEconomicBoardModerator> {
  const moderator = await MyGlobal.prisma.economic_board_moderators.findFirst({
    where: {
      id: props.moderatorId,
      status: "active",
      deleted_at: null,
    },
  });

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  return moderator.id;
}
