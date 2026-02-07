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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EconomicBoardSectionDeletionTransformer } from "../transformers/EconomicBoardSectionDeletionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardSuperAdministratorAuditDeletions(props: {
  superAdministrator: SuperadministratorPayload;
}): Promise<IPageIEconomicBoardSectionDeletion> {
  const page = Math.max(1, 1); // default 1
  const limit = Math.min(100, 20); // default 20, max 100
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.economic_board_section_deletions.findMany({
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EconomicBoardSectionDeletionTransformer.select(),
  });
  const total = await MyGlobal.prisma.economic_board_section_deletions.count();
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicBoardSectionDeletionTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
