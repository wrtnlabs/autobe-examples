import { IEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardBan";
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

export async function patchEconomicBoardAdministratorBans(props: {
  administrator: AdministratorPayload;
  body: IEconomicBoardBan.IRequest;
}): Promise<IPageIEconomicBoardBan.ISum> {
  // Since IEconomicBoardBan.IRequest is an empty object {}, there are no search or filter parameters
  // Default pagination
  const page = 1; // Default page when body is empty
  const limit = 100; // Default limit when body is empty
  const skip = (page - 1) * limit;
  // Query all active bans (unbanned_at is null) for the administrator, with no filters
  const whereInput: Prisma.economic_board_bansWhereInput = {
    unbanned_at: null,
    citizen: {
      deleted_at: null,
    },
    administrator: {
      id: props.administrator.id,
      deleted_at: null,
    },
  };
  // Use the administrator's ID to ensure data privacy and access control
  // But since the body has no filters, we return all bans where the administrator is the issuer
  // No pagination parameters from body so use defaults
  const data = await MyGlobal.prisma.economic_board_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      banned_at: "desc",
    },
    select: {
      id: true,
      ban_reason: true,
      banned_at: true,
      unbanned_at: true,
      citizen: {
        select: {
          display_name: true,
        },
      },
      administrator: {
        select: {
          display_name: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.economic_board_bans.count({
    where: whereInput,
  });
  // According to schema, IEconomicBoardBan.ISum is an empty object {}
  // So we return empty objects for each entry
  const mappedData: IEconomicBoardBan.ISum[] = data.map(
    () => ({}) as IEconomicBoardBan.ISum,
  );
  return {
    data: mappedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
