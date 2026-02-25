import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EconomicBoardCitizenTransformer } from "../transformers/EconomicBoardCitizenTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicBoardAdministratorAdminUsersUserIdUnban(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardCitizen> {
  const user = await MyGlobal.prisma.economic_board_citizens.findUniqueOrThrow({
    where: { id: props.userId },
    select: { id: true, is_banned: true },
  });
  if (!user.is_banned) {
    throw new HttpException("USER_NOT_BANNED", 400);
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const updated = await MyGlobal.prisma.economic_board_citizens.update({
    where: { id: props.userId },
    data: {
      is_banned: false,
      ban_reason: null,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.economic_board_administrator_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.administrator.id,
      target_id: props.userId,
      action_type: "UNBAN",
      reason: "User unban action",
      ip_address: "127.0.0.1",
      created_at: now,
      updated_at: now,
    },
  });
  return EconomicBoardCitizenTransformer.transform(
    await MyGlobal.prisma.economic_board_citizens.findUniqueOrThrow({
      where: { id: props.userId },
      ...EconomicBoardCitizenTransformer.select(),
    }),
  );
}
