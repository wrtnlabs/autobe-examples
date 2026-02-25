import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardCitizenTransformer } from "../transformers/EconomicBoardCitizenTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardUsersUserId(props: {
  userId: string;
}): Promise<IEconomicBoardCitizen> {
  const user = await MyGlobal.prisma.economic_board_citizens.findUniqueOrThrow({
    where: { id: props.userId },
    ...EconomicBoardCitizenTransformer.select(),
  });
  return await EconomicBoardCitizenTransformer.transform(user);
}
