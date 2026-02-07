import { IEconomyPoliticsBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomyPoliticsBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomyPoliticsBoardAdminAdministratorRequests(props: {
  admin: AdminPayload;
  body: IEconomyPoliticsBoardAdministratorRequest.IRequest;
}): Promise<IPageIEconomyPoliticsBoardAdministratorRequest.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.economy_politics_board_administrator_requestsWhereInput =
    {
      deleted_at: null,
    };
  const data =
    await MyGlobal.prisma.economy_politics_board_administrator_requests.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          status: true,
          reason: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  const total =
    await MyGlobal.prisma.economy_politics_board_administrator_requests.count({
      where: whereInput,
    });
  const transformedData = data.map((item) => ({
    id: item.id,
    status: typia.assert<"pending" | "approved" | "rejected">(item.status),
    reason: item.reason,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
