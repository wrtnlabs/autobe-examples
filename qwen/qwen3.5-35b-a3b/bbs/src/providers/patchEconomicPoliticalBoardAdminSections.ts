import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalBoardSectionAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardAdminSections(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalBoardSection.IRequest;
}): Promise<IPageIEconomicPoliticalBoardSection.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const search = props.body.search;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const whereInput: Prisma.economic_political_board_sectionsWhereInput = {
    deleted_at: null,
    ...(search && { name: { contains: search, mode: "insensitive" } }),
  };
  const orderByInput:
    | Prisma.economic_political_board_sectionsOrderByWithRelationInput
    | Prisma.economic_political_board_sectionsOrderByWithRelationInput[] =
    sortBy === "name"
      ? { name: sortOrder as "asc" | "desc" }
      : { created_at: sortOrder as "asc" | "desc" };
  const data = await MyGlobal.prisma.economic_political_board_sections.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EconomicPoliticalBoardSectionAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.economic_political_board_sections.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EconomicPoliticalBoardSectionAtSummaryTransformer.transform,
    ),
  };
}
