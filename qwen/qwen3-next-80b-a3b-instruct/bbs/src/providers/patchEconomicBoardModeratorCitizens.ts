import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IPageIEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardCitizen";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchEconomicBoardModeratorCitizens(props: {
  moderator: ModeratorPayload;
  body: IEconomicBoardCitizen.IRequest;
}): Promise<IPageIEconomicBoardCitizen.ISummary> {
  const searchQuery = typia.assert<string>(props.body);
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null,
    email: searchQuery ? { contains: searchQuery } : undefined,
  };

  const [citizens, total] = await Promise.all([
    MyGlobal.prisma.economic_board_citizens.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
      },
    }),
    MyGlobal.prisma.economic_board_citizens.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: citizens.map((citizen) => citizen.id),
  };
}
