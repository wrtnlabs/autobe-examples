import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomyPoliticsBoardUserTransformer } from "../transformers/EconomyPoliticsBoardUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomyPoliticsBoardUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<IEconomyPoliticsBoardUser> {
  const userRecord =
    await MyGlobal.prisma.economy_politics_board_users.findUnique({
      where: { id: props.userId },
      ...EconomyPoliticsBoardUserTransformer.select(),
    });
  if (!userRecord || userRecord.deleted_at) {
    throw new HttpException("User not found", 404);
  }
  return await EconomyPoliticsBoardUserTransformer.transform(userRecord);
}
