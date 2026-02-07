import { IDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchResult";
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

export async function getDiscussionBoardSearchResultsResultId(props: {
  resultId: string;
}): Promise<IDiscussionBoardSearchResult> {
  const result =
    await MyGlobal.prisma.discussion_board_search_results.findUnique({
      where: { id: props.resultId },
      select: {
        id: true,
        search_query_id: true,
        article_id: true,
        member_id: true,
        result_position: true,
        relevance_score: true,
        content_snippet: true,
        created_at: true,
        article: {
          select: {
            id: true,
            title: true,
            content: true,
            created_at: true,
          },
        },
      },
    });
  if (!result) {
    throw new HttpException("Search result not found", 404);
  }
  return {
    id: result.id as string & tags.Format<"uuid">,
    search_query_id: result.search_query_id as string & tags.Format<"uuid">,
    article_id: result.article_id as string & tags.Format<"uuid">,
    member_id: result.member_id as (string & tags.Format<"uuid">) | null,
    result_position: result.result_position,
    relevance_score: result.relevance_score,
    content_snippet: result.content_snippet,
    created_at: toISOStringSafe(result.created_at) as string &
      tags.Format<"date-time">,
    article: result.article
      ? {
          id: result.article.id as string & tags.Format<"uuid">,
          title: result.article.title,
          content: result.article.content,
          created_at: toISOStringSafe(result.article.created_at) as string &
            tags.Format<"date-time">,
        }
      : undefined,
  };
}
