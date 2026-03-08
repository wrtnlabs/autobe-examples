import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalBoardBanRecordCollector } from "../collectors/EconomicPoliticalBoardBanRecordCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalBoardBanRecordTransformer } from "../transformers/EconomicPoliticalBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalBoardAdminBanRecords(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalBoardBanRecord.ICreate;
}): Promise<IEconomicPoliticalBoardBanRecord> {
  const targetUser =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findUnique(
      {
        where: { id: props.body.user_id },
      },
    );
  if (targetUser === null) {
    throw new HttpException("User not found", 404);
  }
  const existingBan =
    await MyGlobal.prisma.economic_political_board_ban_records.findFirst({
      where: {
        user_id: props.body.user_id,
      },
    });
  if (existingBan !== null) {
    throw new HttpException("User is already banned", 400);
  }
  const adminRole =
    await MyGlobal.prisma.economic_political_board_administrator_roles.findFirst(
      {
        where: {
          user_id: props.admin.id,
        },
      },
    );
  if (adminRole === null) {
    throw new HttpException("Admin not enrolled", 403);
  }
  const banRecord =
    await MyGlobal.prisma.economic_political_board_ban_records.create({
      data: await EconomicPoliticalBoardBanRecordCollector.collect({
        body: props.body,
        economicPoliticalBoardAdministratorRoles: adminRole,
      }),
      ...EconomicPoliticalBoardBanRecordTransformer.select(),
    });
  return await EconomicPoliticalBoardBanRecordTransformer.transform(banRecord);
}
