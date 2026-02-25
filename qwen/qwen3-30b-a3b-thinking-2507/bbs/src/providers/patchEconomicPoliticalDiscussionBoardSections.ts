import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer } from "../transformers/EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalDiscussionBoardSections(props: {
  body: IEconomicPoliticalDiscussionBoardSection.IRequest;
}): Promise<IPageIEconomicPoliticalDiscussionBoardSection.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereConditions = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  };
  const rawResults =
    await MyGlobal.prisma.economic_political_discussion_board_sections.findMany(
      {
        where: whereConditions,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        ...EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer.select(),
      },
    );
  const data = await ArrayUtil.asyncMap(
    rawResults,
    EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer.transform,
  );
  const total =
    await MyGlobal.prisma.economic_political_discussion_board_sections.count({
      where: whereConditions,
    });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEconomicPoliticalDiscussionBoardSection.ISummary;
}
