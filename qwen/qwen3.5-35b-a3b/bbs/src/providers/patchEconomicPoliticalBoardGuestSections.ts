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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { EconomicPoliticalBoardSectionAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardGuestSections(props: {
  guest: GuestPayload;
  body: IEconomicPoliticalBoardSection.IRequest;
}): Promise<IPageIEconomicPoliticalBoardSection.ISummary> {
  // Parse pagination parameters with defaults and bounds
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build search filter using ILIKE pattern for name matching
  const whereInput: Prisma.economic_political_board_sectionsWhereInput = {
    deleted_at: null,
  };
  if (props.body.search) {
    whereInput.name = {
      contains: props.body.search,
      mode: "insensitive", // Case-insensitive search
    };
  }
  // Build orderBy based on sortBy parameter
  const orderByInput: Prisma.economic_political_board_sectionsOrderByWithRelationInput[] =
    props.body.sortBy === "newest"
      ? [{ created_at: "desc" }]
      : props.body.sortBy === "oldest"
        ? [{ created_at: "asc" }]
        : [{ name: "asc" }];
  // Execute findMany with transformer select
  const data = await MyGlobal.prisma.economic_political_board_sections.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EconomicPoliticalBoardSectionAtSummaryTransformer.select(),
    },
  );
  // Execute count for total records
  const total = await MyGlobal.prisma.economic_political_board_sections.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EconomicPoliticalBoardSectionAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
