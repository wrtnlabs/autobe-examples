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

export async function postDiscussionBoardSearchQueries(props: {
  body: {
    search_query: string;
    search_parameters?: string;
    results_count?: number;
  };
}): Promise<void> {
  await MyGlobal.prisma.discussion_board_search_queries.create({
    data: {
      id: v4(),
      search_query: props.body.search_query,
      search_parameters:
        props.body.search_parameters === undefined
          ? undefined
          : props.body.search_parameters,
      results_count:
        props.body.results_count === undefined
          ? null
          : props.body.results_count,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
