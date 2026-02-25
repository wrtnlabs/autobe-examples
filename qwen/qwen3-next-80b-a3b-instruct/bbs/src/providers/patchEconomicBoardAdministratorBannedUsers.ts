import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardCitizen";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardAdministratorBannedUsers(props: {
  administrator: AdministratorPayload;
  body: IEconomicBoardCitizen.IRequest;
}): Promise<IPageIEconomicBoardCitizen.IS> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.economic_board_administrator_audit_logsWhereInput =
    {
      action_type: "ban",
      target_id: { not: null },
    };
  if (props.body.search && props.body.search.length >= 3) {
    whereClause.reason = { contains: props.body.search, mode: "insensitive" };
  }
  const data =
    await MyGlobal.prisma.economic_board_administrator_audit_logs.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        created_at: true,
        actor_id: true,
        target_id: true,
      },
    });
  const total =
    await MyGlobal.prisma.economic_board_administrator_audit_logs.count({
      where: whereClause,
    });
  const transformedData = await ArrayUtil.asyncMap(data, async (auditLog) => {
    const citizen = await MyGlobal.prisma.economic_board_citizens.findUnique({
      where: { id: auditLog.target_id },
      select: {
        id: true,
        email: true,
        display_name: true,
        ban_reason: true,
      },
    });
    if (!citizen) {
      throw new HttpException("Citizen not found", 404);
    }
    const result: IEconomicBoardCitizen.IS = {
      id: citizen.id,
      email: citizen.email,
      display_name: citizen.display_name,
      ban_reason: citizen.ban_reason,
      banned_at: auditLog.created_at.toISOString(),
    };
    return result;
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEconomicBoardCitizen.IS;
}
