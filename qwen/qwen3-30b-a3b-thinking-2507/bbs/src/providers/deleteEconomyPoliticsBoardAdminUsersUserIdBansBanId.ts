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

export async function deleteEconomyPoliticsBoardAdminUsersUserIdBansBanId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<IEconomyPoliticsBoardUserBan> {
  const existingBan =
    await MyGlobal.prisma.economy_politics_board_user_bans.findUnique({
      where: {
        id: props.banId,
        user_id: props.userId,
        deleted_at: null,
      },
      ...EconomyPoliticsBoardUserBanTransformer.select(),
    });
  if (!existingBan) {
    throw new HttpException("Ban not found", 404);
  }
  const updatedBan =
    await MyGlobal.prisma.economy_politics_board_user_bans.update({
      where: { id: props.banId },
      data: { deleted_at: toISOStringSafe(new Date()) },
      ...EconomyPoliticsBoardUserBanTransformer.select(),
    });
  return await EconomyPoliticsBoardUserBanTransformer.transform(updatedBan);
}
