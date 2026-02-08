import { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleSearchIndexCollector } from "../collectors/DiscussionBoardArticleSearchIndexCollector";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardArticleSearchIndexes(props: {
  body: IDiscussionBoardArticleSearchIndex.ICreate;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleSearchIndex> {
  // Validate the article existence
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) throw new HttpException("Article not found", 404);
  // Collect create input
  const createInput = await DiscussionBoardArticleSearchIndexCollector.collect({
    body: props.body,
    article: article,
  });
  // Create the record
  const created =
    await MyGlobal.prisma.discussion_board_article_search_indexes.create({
      data: createInput,
    });
  // Safe conversion of Date to string using toISOStringSafe
  const createdAt = toISOStringSafe(created.created_at);
  const updatedAt = toISOStringSafe(created.updated_at);
  const deletedAt = created.deleted_at
    ? toISOStringSafe(created.deleted_at)
    : null;
  // Return the created record with correct string & Format<'date-time'> types
  return {
    id: created.id as string & tags.Format<"uuid">,
    discussion_board_article_id: created.discussion_board_article_id as string &
      tags.Format<"uuid">,
    title: created.title,
    body: created.body,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: deletedAt,
  };
}
