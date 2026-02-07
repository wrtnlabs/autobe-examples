import { IEconomicBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSectionDeletion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSectionDeletion";
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

export async function getEconomicBoardAdministratorAuditDeletions(props: {
  administrator: AdministratorPayload;
}): Promise<IPageIEconomicBoardSectionDeletion> {
  // Validate administrator role is authorized
  if (
    props.administrator.type !== "administrator" &&
    props.administrator.type !== "superAdministrator"
  ) {
    throw new HttpException("Unauthorized", 403);
  }
  // Default parameters with max limit constraint
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Query for deletion audit records
  const data = await MyGlobal.prisma.economic_board_section_deletions.findMany({
    where: {},
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    select: {
      section_id: true,
      administrator_id: true,
      created_at: true,
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.economic_board_section_deletions.count(
    {},
  );
  // Transform data with proper type conversion using toISOStringSafe and branded types
  const transformedData: IEconomicBoardSectionDeletion[] = data.map((item) => ({
    section_id: item.section_id as string & tags.Format<"uuid">,
    administrator_id: item.administrator_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(item.created_at) as string &
      tags.Format<"date-time">,
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
