import { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEconomyPoliticsBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomyPoliticsBoardUserBanTransformer } from "../transformers/EconomyPoliticsBoardUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomyPoliticsBoardUserBansBanId(props: {
  user: UserPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IEconomyPoliticsBoardUserBan> {
  const ban = await MyGlobal.prisma.economy_politics_board_user_bans.findUnique(
    {
      where: { id: props.banId },
      ...EconomyPoliticsBoardUserBanTransformer.select(),
    },
  );
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  return await EconomyPoliticsBoardUserBanTransformer.transform(ban);
}
