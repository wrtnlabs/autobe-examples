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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardSuperAdministratorAuditCreations(props: {
  superAdministrator: SuperadministratorPayload;
}): Promise<IPageIEconomicBoardSectionCreation.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query section creations with joins
  const data = await MyGlobal.prisma.economic_board_section_creations.findMany({
    where: {
      section: {
        deleted_at: null,
      },
      creator: {
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
  // Count total records
  const total = await MyGlobal.prisma.economic_board_section_creations.count({
    where: {
      section: {
        deleted_at: null,
      },
      creator: {
        deleted_at: null,
      },
    },
  });
  // Transform to response format
  const transformedData = data.map((creation) => ({
    id: creation.id,
    created_at: toISOStringSafe(creation.created_at),
    section_name: creation.section.name,
    administrator_display_name: creation.creator.display_name,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
