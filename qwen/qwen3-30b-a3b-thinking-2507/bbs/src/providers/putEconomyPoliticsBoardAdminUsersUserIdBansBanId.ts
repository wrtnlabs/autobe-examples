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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomyPoliticsBoardUserBanTransformer } from "../transformers/EconomyPoliticsBoardUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomyPoliticsBoardAdminUsersUserIdBansBanId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: IEconomyPoliticsBoardUserBan.IUpdate;
}): Promise<IEconomyPoliticsBoardUserBan> {
  const existingBan =
    await MyGlobal.prisma.economy_politics_board_user_bans.findUnique({
      where: { id: props.banId },
      ...EconomyPoliticsBoardUserBanTransformer.select(),
    });
  if (!existingBan) {
    throw new HttpException("Ban not found", 404);
  }
  if (existingBan.bannedUser.id !== props.userId) {
    throw new HttpException("Ban not associated with user", 403);
  }
  const updatedBan =
    await MyGlobal.prisma.economy_politics_board_user_bans.update({
      where: { id: props.banId },
      data: {
        reason: props.body.reason,
        expire_at: props.body.expire_at,
      },
      ...EconomyPoliticsBoardUserBanTransformer.select(),
    });
  return await EconomyPoliticsBoardUserBanTransformer.transform(updatedBan);
}
