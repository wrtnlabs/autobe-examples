import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconomicBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardContentFlag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconomicBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardContentFlag";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getEconomicBoardModeratorSettingsContentFlags(props: {
  moderator: ModeratorPayload;
}): Promise<IPageIEconomicBoardContentFlag> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const [flags, total] = await Promise.all([
    MyGlobal.prisma.economic_board_content_flags.findMany({
      skip,
      take: limit,
      orderBy: { code: "asc" },
    }),
    MyGlobal.prisma.economic_board_content_flags.count(),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: flags.map((flag) => flag.code) as string[],
  };
}
