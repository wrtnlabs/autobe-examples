import { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardTag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalBoardTagAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardTagAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardTags(props: {
  body: IEconomicPoliticalBoardTag.IRequest;
}): Promise<IPageIEconomicPoliticalBoardTag.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 50, 200);
  const skip = (page - 1) * limit;
  const search = props.body.search;
  const whereInput: Prisma.economic_political_board_tagsWhereInput = {
    deleted_at: null,
    ...(search !== undefined && {
      name: {
        contains: search,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.economic_political_board_tagsWhereInput;
  const orderByInput = props.body.sort
    ? ({
        [props.body.sort.by]: props.body.sort.order,
      } satisfies Prisma.economic_political_board_tagsOrderByWithRelationInput)
    : { name: "asc" as const };
  const data = await MyGlobal.prisma.economic_political_board_tags.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EconomicPoliticalBoardTagAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.economic_political_board_tags.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicPoliticalBoardTagAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
