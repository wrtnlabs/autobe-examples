import { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardTag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardTagAtSummaryTransformer } from "../transformers/EconomicPoliticalDiscussionBoardTagAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalDiscussionBoardTags(props: {
  body: IEconomicPoliticalDiscussionBoardTag.IRequest;
}): Promise<IPageIEconomicPoliticalDiscussionBoardTag.ISummary> {
  const { page = 1, limit = 20, sort = "newest" } = props.body;
  const currentPage = Math.max(1, page);
  const currentLimit = Math.min(limit, 100);
  const skip = (currentPage - 1) * currentLimit;
  const where: Prisma.economic_political_discussion_board_tagsWhereInput = {
    deleted_at: null,
  };
  const searchParam = props.body?.search;
  if (searchParam) {
    where.name = { contains: searchParam, mode: "insensitive" };
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.economic_political_discussion_board_tags.findMany({
      where,
      skip,
      take: currentLimit,
      orderBy: { created_at: sort === "newest" ? "desc" : "asc" },
      ...EconomicPoliticalDiscussionBoardTagAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.economic_political_discussion_board_tags.count({ where }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(data, (tag) =>
    EconomicPoliticalDiscussionBoardTagAtSummaryTransformer.transform(tag),
  );
  const pagination = {
    current: currentPage,
    limit: currentLimit,
    records: total,
    pages: Math.ceil(total / currentLimit),
  };
  return {
    data: transformedData,
    pagination,
  };
}
