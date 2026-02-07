import { IEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardBanCollector } from "../collectors/EconomicBoardBanCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicBoardAdministratorBans(props: {
  administrator: AdministratorPayload;
  body: IEconomicBoardBan.ICreate;
}): Promise<IEconomicBoardBan> {
  const created = await MyGlobal.prisma.economic_board_bans.create({
    data: await EconomicBoardBanCollector.collect({
      body: props.body,
      administrator: props.administrator,
      citizen: props.administrator,
    }),
  });
  return {
    id: created.id as string & tags.Format<"uuid">,
    citizen_id: created.economic_board_citizens_id as string &
      tags.Format<"uuid">,
    administrator_id: created.economic_board_administrators_id as string &
      tags.Format<"uuid">,
    ban_reason: created.ban_reason,
    banned_at: toISOStringSafe(created.banned_at) as string &
      tags.Format<"date-time">,
    unbanned_at: created.unbanned_at
      ? (toISOStringSafe(created.unbanned_at) as string &
          tags.Format<"date-time">)
      : null,
  };
}
