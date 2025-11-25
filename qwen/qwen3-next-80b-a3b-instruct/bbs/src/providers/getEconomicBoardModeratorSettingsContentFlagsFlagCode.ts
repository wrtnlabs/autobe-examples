import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardContentFlag";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getEconomicBoardModeratorSettingsContentFlagsFlagCode(props: {
  moderator: ModeratorPayload;
  flagCode: string;
}): Promise<IEconomicBoardContentFlag> {
  const flag = await MyGlobal.prisma.economic_board_content_flags.findUnique({
    where: {
      code: props.flagCode,
    },
  });

  if (!flag) {
    throw new HttpException("Content flag not found", 404);
  }

  return flag.code;
}
