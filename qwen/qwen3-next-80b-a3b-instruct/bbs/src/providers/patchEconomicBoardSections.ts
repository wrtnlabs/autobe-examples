import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardSectionAtSummaryTransformer } from "../transformers/EconomicBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEconomicBoardSections(props: {
  body: IEconomicBoardSection.IRequest;
}): Promise<IPageIEconomicBoardSection.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build order condition
  const orderBy: Prisma.economic_board_sectionsOrderByWithRelationInput =
    props.body.sort === "name_asc"
      ? { name: "asc" }
      : props.body.sort === "name_desc"
        ? { name: "desc" }
        : props.body.sort === "created_at_asc"
          ? { created_at: "asc" }
          : { created_at: "desc" };
  // Query active sections with pagination
  const data = await MyGlobal.prisma.economic_board_sections.findMany({
    where: {
      deleted_at: null,
      ...(props.body.search
        ? {
            name: {
              contains: props.body.search,
              mode: "insensitive" as Prisma.QueryMode,
            },
          }
        : {}),
    },
    skip,
    take: limit,
    orderBy,
    ...EconomicBoardSectionAtSummaryTransformer.select(),
  });
  // Count total active sections
  const total = await MyGlobal.prisma.economic_board_sections.count({
    where: {
      deleted_at: null,
      ...(props.body.search
        ? {
            name: {
              contains: props.body.search,
              mode: "insensitive" as Prisma.QueryMode,
            },
          }
        : {}),
    },
  });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EconomicBoardSectionAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEconomicBoardSection.ISummary;
}
