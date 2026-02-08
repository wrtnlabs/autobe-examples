import { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSearchIndex";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticleSearchIndexes(props: {
  body: IDiscussionBoardArticleSearchIndex.IRequest;
}): Promise<IPageIDiscussionBoardArticleSearchIndex.ISummary> {
  // Set default pagination parameters
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Fetch data with default pagination and sorting
  const data =
    await MyGlobal.prisma.discussion_board_article_search_indexes.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  // Count total records
  const total =
    await MyGlobal.prisma.discussion_board_article_search_indexes.count();
  // Map data to IDiscussionBoardArticleSearchIndex.ISummary[]
  const mappedData: IDiscussionBoardArticleSearchIndex.ISummary[] = data.map(
    (record) => ({
      ...record,
      created_at: toISOStringSafe(record.created_at),
      updated_at: record.updated_at ? toISOStringSafe(record.updated_at) : null,
    }),
  );
  // Construct pagination metadata
  const pagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  } as IPage.IPagination;
  return { pagination, data: mappedData };
}
