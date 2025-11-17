import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardSearchMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSearchMetadata";
import { IPageIEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";

export async function patchEconomicBoardSearch(props: {
  body: IEconomicBoardSearchMetadata.IRequest;
}): Promise<IPageIEconomicBoardPost.ISummary> {
  const searchTerm = props.body;

  if (!searchTerm || searchTerm.trim() === "") {
    throw new HttpException("Search query cannot be empty", 400);
  }

  // Extract the search tokens from index where tokens match the search term
  const searchResults =
    await MyGlobal.prisma.economic_board_search_index.findMany({
      where: {
        tokens: { contains: searchTerm.toUpperCase(), mode: "insensitive" },
      },
      orderBy: { updated_at: "desc" },
      take: 100,
      skip: 0,
    });

  const postIds = searchResults.map((result) => result.economic_board_post_id);

  if (postIds.length === 0) {
    return {
      pagination: {
        current: 1,
        limit: 100,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Return only the post IDs as strings, since IEconomicBoardPost.ISummary is a string type
  const data: IEconomicBoardPost.ISummary[] = postIds;

  return {
    pagination: {
      current: 1,
      limit: 100,
      records: data.length,
      pages: Math.ceil(data.length / 100),
    },
    data,
  };
}
