import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getEconomicBoardModeratorCitizensCitizenId(props: {
  moderator: ModeratorPayload;
  citizenId: string;
}): Promise<IEconomicBoardCitizen> {
  const citizen = await MyGlobal.prisma.economic_board_citizens.findUnique({
    where: {
      id: props.citizenId,
      deleted_at: null,
    },
  });

  if (!citizen) {
    throw new HttpException("Citizen not found or deleted", 404);
  }

  return citizen.id;
}
