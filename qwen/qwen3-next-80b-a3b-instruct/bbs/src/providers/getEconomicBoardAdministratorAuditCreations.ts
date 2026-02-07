import { IEconomicBoardSectionCreation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSectionCreation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardSectionCreation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSectionCreation";
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

export async function getEconomicBoardAdministratorAuditCreations(props: {
  administrator: AdministratorPayload;
}): Promise<IPageIEconomicBoardSectionCreation.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.economic_board_section_creations.findMany({
    where: {
      section: {
        deleted_at: null,
      },
    },
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      created_at: true,
      section: {
        select: {
          name: true,
        },
      },
      creator: {
        select: {
          display_name: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.economic_board_section_creations.count({
    where: {
      section: {
        deleted_at: null,
      },
    },
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      name: record.section.name,
      display_name: record.creator.display_name,
      created_at: toISOStringSafe(record.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
