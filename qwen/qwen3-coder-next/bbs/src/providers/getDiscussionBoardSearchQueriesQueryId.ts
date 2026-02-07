import { IDiscussionBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchQuery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSearchQueriesQueryId(props: {
  queryId: string;
}): Promise<IDiscussionBoardSearchQuery> {
  const record =
    await MyGlobal.prisma.discussion_board_search_queries.findUnique({
      where: { id: props.queryId },
    });
  if (!record) {
    throw new HttpException("Search query not found", 404);
  }
  return {
    id: record.id,
    search_query: record.search_query,
    search_parameters:
      record.search_parameters === null ? undefined : record.search_parameters,
    results_count: record.results_count,
    created_at: toISOStringSafe(record.created_at),
  };
}
